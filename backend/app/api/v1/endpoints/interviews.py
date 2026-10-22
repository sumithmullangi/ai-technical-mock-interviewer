from collections import defaultdict
from typing import Dict, List, Optional
import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.api.deps import get_current_user, get_optional_current_user
from app.models.user import UserModel
from app.models.interview import (
    AnswerEvaluationModel,
    CandidateAnswerModel,
    FollowUpQuestionModel,
    InterviewReportModel,
    InterviewSessionModel,
    PrimaryQuestionModel,
)
from app.schemas.interview import (
    AnswerEvaluationRequest,
    AnswerEvaluationResponse,
    AnswerSubmitRequest,
    AnswerSubmitResponse,
    CodingLanguage,
    EvaluationScoresSchema,
    FollowUpAnswerRequest,
    FollowUpAnswerResponse,
    FollowUpQuestionRequest,
    FollowUpQuestionResponse,
    InterviewConfigCreate,
    InterviewConfigResponse,
    InterviewReportResponse,
    PrimaryQuestionResponse,
    QuestionReportItem,
    ScoreBreakdown,
    SeniorityLevel,
    SessionAdvanceResponse,
    SessionStartResponse,
    SessionStatus,
    calculate_weighted_overall_score,
)
from app.schemas.voice import (
    VoiceSessionRequest,
    VoiceSessionResponse,
    VoiceInteractionRequest,
    VoiceInteractionResponse,
)
from app.services.voice_service import (
    VoiceServiceError,
    VoiceServiceNotConfiguredError,
    VoiceServiceProviderError,
    generate_voice_conversational_reply,
    request_realtime_session,
)
import logging
from app.core.config import settings
from app.services.gemini_service import (
    GeminiProviderError,
    GeminiQuotaExceededError,
    GeminiServiceError,
    GeminiValidationError,
    evaluate_candidate_answer,
    generate_follow_up_question,
    generate_interview_question,
    generate_offline_mock_question,
    generate_report_narrative,
)

logger = logging.getLogger(__name__)

router = APIRouter()


def verify_session_access(
    session_record: InterviewSessionModel,
    current_user: Optional[UserModel],
) -> None:
    """Verifies that the current user has permission to access the interview session.

    Rules:
    - If session_record.user_id is None (guest or legacy session created prior to auth),
      access is permitted to ensure backward compatibility.
    - If session_record.user_id is set:
      - If current_user is None: 401 UNAUTHORIZED (Authentication required).
      - If current_user.id != session_record.user_id: 403 FORBIDDEN.
    """
    session_user_id = getattr(session_record, "user_id", None)
    if isinstance(session_user_id, str) and session_user_id:
        if current_user is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required to access this interview session.",
                headers={"WWW-Authenticate": "Bearer"},
            )
        if current_user.id != session_user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Forbidden: You do not have permission to access this interview session.",
            )


@router.post(
    "/config",
    response_model=InterviewConfigResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate, register, and persist interview configuration",
)
async def configure_interview(
    config: InterviewConfigCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_optional_current_user),
) -> InterviewConfigResponse:
    """Validates candidate interview configuration and persists the session to PostgreSQL.

    Ensures:
    - Engineering role is between 2 and 100 characters.
    - Seniority is one of Junior, Mid, Senior, Staff.
    - Coding language is one of Python, Java, SQL.
    - Question count is strictly bounded between 3 and 10.
    - Session is saved to PostgreSQL in 'configured' state with transactional safety.
    - Associates authenticated user_id if present.
    """
    session_id = f"mock-{uuid.uuid4().hex[:12]}"
    created_at = datetime.now(timezone.utc)

    # Persist the session in PostgreSQL
    session_record = InterviewSessionModel(
        id=session_id,
        user_id=current_user.id if current_user else None,
        role=config.role,
        difficulty=config.difficulty.value if hasattr(config.difficulty, "value") else str(config.difficulty),
        primary_language=config.primary_language.value if hasattr(config.primary_language, "value") else str(config.primary_language),
        question_count=config.question_count,
        status=SessionStatus.CONFIGURED.value,
        created_at=created_at,
    )

    try:
        db.add(session_record)
        await db.commit()
        await db.refresh(session_record)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction failed: {type(exc).__name__}",
        ) from exc

    return InterviewConfigResponse(
        status=session_record.status,
        session_id=session_record.id,
        user_id=session_record.user_id,
        config=config,
        message="Interview configuration validated and persisted successfully. Ready for session initiation.",
        created_at=session_record.created_at,
    )


@router.get(
    "/history",
    response_model=List[InterviewConfigResponse],
    status_code=status.HTTP_200_OK,
    summary="Retrieve interview history for the authenticated user",
)
async def list_user_interview_history(
    db: AsyncSession = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
) -> List[InterviewConfigResponse]:
    """Retrieves all interview sessions belonging to the authenticated user, ordered newest first."""
    stmt = (
        select(InterviewSessionModel)
        .where(InterviewSessionModel.user_id == current_user.id)
        .order_by(InterviewSessionModel.created_at.desc())
    )
    result = await db.execute(stmt)
    sessions = result.scalars().all()

    return [
        InterviewConfigResponse(
            status=s.status,
            session_id=s.id,
            user_id=s.user_id,
            config=InterviewConfigCreate(
                role=s.role,
                difficulty=SeniorityLevel(s.difficulty),
                primary_language=CodingLanguage(s.primary_language),
                question_count=s.question_count,
            ),
            message="Interview session retrieved from history.",
            created_at=s.created_at,
        )
        for s in sessions
    ]


@router.get(
    "/{session_id}",
    response_model=InterviewConfigResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve persisted interview session",
)
async def get_interview_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_optional_current_user),
) -> InterviewConfigResponse:
    """Retrieves an existing interview session from PostgreSQL by session ID."""
    query = select(InterviewSessionModel).where(InterviewSessionModel.id == session_id)
    result = await db.execute(query)
    session_record = result.scalar_one_or_none()

    if session_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{session_id}' not found.",
        )

    verify_session_access(session_record, current_user)

    # Reconstruct the config schema
    reconstructed_config = InterviewConfigCreate(
        role=session_record.role,
        difficulty=SeniorityLevel(session_record.difficulty),
        primary_language=CodingLanguage(session_record.primary_language),
        question_count=session_record.question_count,
    )

    return InterviewConfigResponse(
        status=session_record.status,
        session_id=session_record.id,
        user_id=session_record.user_id,
        config=reconstructed_config,
        message="Interview session retrieved successfully.",
        created_at=session_record.created_at,
    )


@router.post(
    "/{session_id}/start",
    response_model=SessionStartResponse,
    status_code=status.HTTP_200_OK,
    summary="Start an interview session and generate Question 1",
)
async def start_interview_session(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_optional_current_user),
) -> SessionStartResponse:
    """Transitions a configured interview session to 'in_progress' and generates Question 1.

    Guards & Concurrency:
    - Returns 404 if the session ID does not exist in PostgreSQL.
    - Returns 409 Conflict if the session is not in 'configured' state (e.g. already started or completed).
    - Concurrency-safe: acquires row-level lock using SELECT ... FOR UPDATE.
    - Transactional safety: if question generation fails, session remains in 'configured' state (rollback).
    """
    stmt = (
        select(InterviewSessionModel)
        .where(InterviewSessionModel.id == session_id)
        .with_for_update()
    )
    result = await db.execute(stmt)
    session_record = result.scalar_one_or_none()

    if session_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{session_id}' not found.",
        )

    verify_session_access(session_record, current_user)

    if session_record.status != SessionStatus.CONFIGURED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot start interview session '{session_id}' with status '{session_record.status}'. "
                f"Only sessions in '{SessionStatus.CONFIGURED.value}' state can be started."
            ),
        )

    # Generate Question 1 via Gemini service (or deterministic offline mock if quota exceeded / unconfigured / unavailable)
    try:
        first_question = await generate_interview_question(
            role=session_record.role,
            difficulty=SeniorityLevel(session_record.difficulty),
            primary_language=CodingLanguage(session_record.primary_language),
            question_number=1,
            allow_offline=True,
        )
    except GeminiQuotaExceededError as exc:
        await db.rollback()
        retry_delay = int(exc.retry_after or (3600 if getattr(exc, "is_quota_exhausted", False) else 5))
        headers = {"Retry-After": str(retry_delay)}
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"AI rate limit exceeded during session start: {str(exc)}",
            headers=headers,
        ) from exc
    except GeminiServiceError as exc:
        await db.rollback()
        msg = getattr(exc, "message", None) or str(exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Question generation failed: {msg}",
        ) from exc
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during question generation: {type(exc).__name__}",
        ) from exc

    # Persist Question 1 to primary_questions table
    pq_record = PrimaryQuestionModel(
        id=f"pq-{uuid.uuid4().hex[:12]}",
        session_id=session_record.id,
        question_number=1,
        topic=first_question.topic,
        difficulty=first_question.difficulty.value if hasattr(first_question.difficulty, "value") else str(first_question.difficulty),
        question_text=first_question.question_text,
        starter_code=first_question.starter_code,
        expected_concepts=first_question.expected_concepts,
        created_at=datetime.now(timezone.utc),
    )
    db.add(pq_record)

    # Transition state to in_progress and commit
    session_record.status = SessionStatus.IN_PROGRESS.value
    try:
        await db.commit()
        await db.refresh(session_record)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to persist session start state: {type(exc).__name__}",
        ) from exc

    return SessionStartResponse(
        status=SessionStatus(session_record.status),
        session_id=session_record.id,
        current_question=first_question,
        message="Interview session started successfully. Question 1 generated.",
        started_at=datetime.now(timezone.utc),
    )


@router.post(
    "/{session_id}/answer",
    response_model=AnswerSubmitResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit and persist candidate answer for the current question",
)
@router.post(
    "/{session_id}/answers",
    response_model=AnswerSubmitResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit and persist candidate answer for the current question (plural alias)",
)
async def submit_candidate_answer(
    session_id: str,
    request: AnswerSubmitRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_optional_current_user),
) -> AnswerSubmitResponse:
    """Submits and persists candidate answer text or code to PostgreSQL.

    Guards:
    - 404: Session not found in database.
    - 409: Session is not in 'in_progress' state.
    - 422: Question number out of bounds or empty/whitespace answer text.
    - Transactional: Rolls back on DB failure; does not execute candidate code or advance question.
    """
    stmt = select(InterviewSessionModel).where(InterviewSessionModel.id == session_id)
    result = await db.execute(stmt)
    session_record = result.scalar_one_or_none()

    if session_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{session_id}' not found.",
        )

    verify_session_access(session_record, current_user)

    if session_record.status != SessionStatus.IN_PROGRESS.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot submit answer for interview session '{session_id}' with status '{session_record.status}'. "
                f"Only sessions in '{SessionStatus.IN_PROGRESS.value}' state accept answers."
            ),
        )

    if request.question_number < 1 or request.question_number > session_record.question_count:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Question number {request.question_number} is out of bounds. "
                f"This session contains {session_record.question_count} questions."
            ),
        )

    answer_id = f"ans-{uuid.uuid4().hex[:12]}"
    submitted_at = datetime.now(timezone.utc)

    answer_record = CandidateAnswerModel(
        id=answer_id,
        session_id=session_record.id,
        question_number=request.question_number,
        answer_text=request.answer_text,
        submitted_at=submitted_at,
    )

    try:
        db.add(answer_record)
        await db.commit()
        await db.refresh(answer_record)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction failed while saving answer: {type(exc).__name__}",
        ) from exc

    return AnswerSubmitResponse(
        status="submitted",
        answer_id=answer_record.id,
        session_id=session_record.id,
        question_number=answer_record.question_number,
        message="Answer submitted and persisted successfully.",
        submitted_at=answer_record.submitted_at,
    )


@router.post(
    "/{session_id}/answers/{answer_id}/evaluate",
    response_model=AnswerEvaluationResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate an already-persisted candidate answer using Gemini AI",
)
@router.post(
    "/{session_id}/evaluate",
    response_model=AnswerEvaluationResponse,
    status_code=status.HTTP_200_OK,
    summary="Evaluate an already-persisted candidate answer (body-based alias)",
)
async def evaluate_persisted_answer(
    session_id: str,
    answer_id: Optional[str] = None,
    request: Optional[AnswerEvaluationRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_optional_current_user),
) -> AnswerEvaluationResponse:
    """Evaluates an already-persisted answer using Gemini AI and stores the evaluation.

    Guards:
    - 404: Session not found.
    - 404: Answer not found or does not belong to session.
    - 409: Duplicate evaluation conflict (answer already evaluated).
    - 503: Gemini API key unconfigured (clear actionable error).
    - 502: Gemini provider error or schema validation failure.
    - 500: Database transaction rollback on persistence failure.
    - Never executes candidate code. Treats answer strictly as untrusted text.
    """
    target_answer_id = answer_id or (request.answer_id if request else None)
    target_q_num = request.question_number if request else None
    if not target_answer_id and target_q_num is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Missing answer_id or question_number. Specify answer_id in path/body or question_number in body.",
        )

    # 1. Verify session exists
    session_stmt = select(InterviewSessionModel).where(InterviewSessionModel.id == session_id)
    session_result = await db.execute(session_stmt)
    session_record = session_result.scalar_one_or_none()
    if session_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{session_id}' not found.",
        )

    verify_session_access(session_record, current_user)

    # 2. Verify answer exists and belongs to session
    if target_answer_id:
        answer_stmt = select(CandidateAnswerModel).where(CandidateAnswerModel.id == target_answer_id)
        answer_result = await db.execute(answer_stmt)
        answer_record = answer_result.scalar_one_or_none()
        if answer_record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Candidate answer '{target_answer_id}' not found.",
            )
        if answer_record.session_id != session_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Candidate answer '{target_answer_id}' does not belong to session '{session_id}'.",
            )
    else:
        answer_stmt = (
            select(CandidateAnswerModel)
            .where(
                CandidateAnswerModel.session_id == session_id,
                CandidateAnswerModel.question_number == target_q_num,
            )
            .order_by(CandidateAnswerModel.submitted_at.desc())
        )
        answer_result = await db.execute(answer_stmt)
        answer_record = answer_result.scalars().first()
        if answer_record is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No candidate answer found for question #{target_q_num} in session '{session_id}'.",
            )
        target_answer_id = answer_record.id

    # 3. Check for existing evaluation to prevent conflicting records (409 Conflict)
    eval_stmt = select(AnswerEvaluationModel).where(AnswerEvaluationModel.answer_id == target_answer_id)
    eval_result = await db.execute(eval_stmt)
    existing_eval = eval_result.scalar_one_or_none()
    if existing_eval is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Candidate answer '{target_answer_id}' has already been evaluated.",
        )

    # 4. Context for evaluation
    q_text = request.question_text if request and request.question_text else None
    concepts = request.expected_concepts if request and request.expected_concepts is not None else None

    if not q_text or concepts is None:
        try:
            pq_stmt = select(PrimaryQuestionModel).where(
                PrimaryQuestionModel.session_id == session_id,
                PrimaryQuestionModel.question_number == answer_record.question_number,
            )
            pq_res = await db.execute(pq_stmt)
            pq_record = pq_res.scalar_one_or_none()
            if pq_record:
                if not q_text and pq_record.question_text:
                    q_text = pq_record.question_text
                if concepts is None and pq_record.expected_concepts:
                    concepts = pq_record.expected_concepts
        except Exception:
            pass

    if not q_text:
        q_text = (
            f"Technical interview problem for {session_record.role} ({session_record.difficulty}) "
            f"in {session_record.primary_language}."
        )
    if concepts is None:
        concepts = []

    # 5. Call Gemini service evaluation
    try:
        eval_output, overall_score = await evaluate_candidate_answer(
            role=session_record.role,
            difficulty=SeniorityLevel(session_record.difficulty),
            primary_language=CodingLanguage(session_record.primary_language),
            question_text=q_text,
            expected_concepts=concepts,
            answer_text=answer_record.answer_text,
        )
    except GeminiQuotaExceededError as exc:
        retry_delay = int(exc.retry_after or (3600 if getattr(exc, "is_quota_exhausted", False) else 5))
        headers = {"Retry-After": str(retry_delay)}
        if getattr(exc, "is_quota_exhausted", False):
            msg = (
                "AI evaluation quota exhausted: Live AI evaluation is temporarily unavailable due to Gemini API daily quota limits. "
                "Your answer has been safely recorded. You can proceed directly to the next question."
            )
        else:
            msg = f"AI evaluation rate limit exceeded. Please wait a few seconds before retrying: {str(exc)}"
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=msg,
            headers=headers,
        ) from exc
    except GeminiProviderError as exc:
        err_msg = str(exc)
        if "Gemini API key is not configured" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=err_msg,
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI evaluation service provider error: {err_msg}",
        ) from exc
    except GeminiValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI evaluation validation error: {str(exc)}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during AI answer evaluation: {type(exc).__name__}",
        ) from exc

    # 6. Transactionally persist evaluation
    eval_id = f"eval-{uuid.uuid4().hex[:12]}"
    eval_record = AnswerEvaluationModel(
        id=eval_id,
        answer_id=answer_record.id,
        session_id=session_record.id,
        correctness_score=eval_output.correctness,
        technical_depth_score=eval_output.technical_depth,
        edge_cases_score=eval_output.edge_cases,
        communication_score=eval_output.communication,
        overall_score=overall_score,
        feedback=eval_output.feedback,
        strengths=eval_output.strengths,
        missing_concepts=eval_output.missing_concepts,
        suggestions=eval_output.suggestions,
        created_at=datetime.now(timezone.utc),
    )

    try:
        db.add(eval_record)
        await db.commit()
        await db.refresh(eval_record)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction failed while saving evaluation: {type(exc).__name__}",
        ) from exc

    return AnswerEvaluationResponse(
        status="evaluated",
        evaluation_id=eval_record.id,
        answer_id=eval_record.answer_id,
        session_id=eval_record.session_id,
        scores=EvaluationScoresSchema(
            correctness=eval_record.correctness_score,
            technical_depth=eval_record.technical_depth_score,
            edge_cases=eval_record.edge_cases_score,
            communication=eval_record.communication_score,
        ),
        overall_score=eval_record.overall_score,
        feedback=eval_record.feedback,
        strengths=eval_record.strengths,
        missing_concepts=eval_record.missing_concepts,
        suggestions=eval_record.suggestions,
        evaluated_at=eval_record.created_at,
    )


@router.post(
    "/{session_id}/questions/{question_number}/follow-up",
    response_model=FollowUpQuestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate an adaptive technical follow-up question (max 2 per primary question)",
)
@router.post(
    "/{session_id}/follow-up",
    response_model=FollowUpQuestionResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate an adaptive technical follow-up question (alias)",
)
async def request_follow_up_question(
    session_id: str,
    question_number: Optional[int] = None,
    request: Optional[FollowUpQuestionRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_optional_current_user),
) -> FollowUpQuestionResponse:
    """Generates and persists an adaptive technical follow-up question for a primary question.

    Guards:
    - 404: Session not found.
    - 409: Session not in 'in_progress' state.
    - 422: Question number out of bounds.
    - 404: No primary candidate answer submitted yet for this question.
    - 409: Maximum of 2 follow-ups reached for this question.
    - 409: Prior follow-up unanswered.
    - 503: Gemini API key unconfigured.
    - 502: Gemini provider or validation failure.
    - 500: Database rollback on transaction failure.
    - Concurrency-safe: acquires row-level lock on session record.
    """
    target_q_num = question_number or (request.primary_question_number if request else 1) or 1

    # 1. Fetch session with FOR UPDATE to serialize concurrent follow-up requests
    session_stmt = (
        select(InterviewSessionModel)
        .where(InterviewSessionModel.id == session_id)
        .with_for_update()
    )
    session_result = await db.execute(session_stmt)
    session_record = session_result.scalar_one_or_none()
    if session_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{session_id}' not found.",
        )

    verify_session_access(session_record, current_user)

    if session_record.status != SessionStatus.IN_PROGRESS.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot request follow-up: Session '{session_id}' is in status '{session_record.status}'. "
                f"Only sessions in '{SessionStatus.IN_PROGRESS.value}' state accept follow-ups."
            ),
        )

    if target_q_num < 1 or target_q_num > session_record.question_count:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Question number {target_q_num} is out of bounds. "
                f"This session contains {session_record.question_count} questions."
            ),
        )

    # 2. Verify primary answer exists
    ans_stmt = (
        select(CandidateAnswerModel)
        .where(
            CandidateAnswerModel.session_id == session_id,
            CandidateAnswerModel.question_number == target_q_num,
        )
        .order_by(CandidateAnswerModel.submitted_at.desc())
    )
    ans_result = await db.execute(ans_stmt)
    primary_answer = ans_result.scalars().first()
    if primary_answer is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Cannot generate follow-up: No candidate answer submitted yet for question {target_q_num}.",
        )

    # Fetch evaluation feedback if available
    eval_stmt = select(AnswerEvaluationModel).where(AnswerEvaluationModel.answer_id == primary_answer.id)
    eval_result = await db.execute(eval_stmt)
    eval_record = eval_result.scalar_one_or_none()

    eval_feedback = (
        (request.evaluation_feedback if request and request.evaluation_feedback else None)
        or (eval_record.feedback if eval_record else None)
    )
    missing_concepts = (
        (request.missing_concepts if request and request.missing_concepts else None)
        or (eval_record.missing_concepts if eval_record else [])
    )

    # 3. Check existing follow-ups for this primary question
    fu_stmt = (
        select(FollowUpQuestionModel)
        .where(
            FollowUpQuestionModel.session_id == session_id,
            FollowUpQuestionModel.primary_question_number == target_q_num,
        )
        .order_by(FollowUpQuestionModel.follow_up_number.asc())
    )
    fu_result = await db.execute(fu_stmt)
    existing_follow_ups = fu_result.scalars().all()

    if len(existing_follow_ups) >= 2:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Maximum limit of 2 follow-up questions reached for question {target_q_num}.",
        )

    if len(existing_follow_ups) == 1:
        first_fu = existing_follow_ups[0]
        if not first_fu.candidate_answer or not first_fu.candidate_answer.strip():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Please submit an answer for follow-up question #1 before requesting follow-up #2.",
            )
        next_follow_up_number = 2
        candidate_text_context = (
            f"Primary Answer: {primary_answer.answer_text}\n\n"
            f"Follow-up #1 Answer: {first_fu.candidate_answer}"
        )
    else:
        next_follow_up_number = 1
        candidate_text_context = primary_answer.answer_text

    primary_q_text = (
        (request.question_text if request and request.question_text else None)
        or f"Technical problem for {session_record.role} in {session_record.primary_language}."
    )

    # 4. Generate follow-up via Gemini
    try:
        fu_output = await generate_follow_up_question(
            role=session_record.role,
            difficulty=SeniorityLevel(session_record.difficulty),
            primary_language=CodingLanguage(session_record.primary_language),
            primary_question_number=target_q_num,
            primary_question_text=primary_q_text,
            follow_up_number=next_follow_up_number,
            candidate_answer_text=candidate_text_context,
            evaluation_feedback=eval_feedback,
            missing_concepts=missing_concepts,
        )
    except GeminiQuotaExceededError as exc:
        retry_delay = int(exc.retry_after or (3600 if getattr(exc, "is_quota_exhausted", False) else 5))
        headers = {"Retry-After": str(retry_delay)}
        if getattr(exc, "is_quota_exhausted", False):
            msg = (
                "AI follow-up quota exhausted: Live adaptive follow-up generation is temporarily unavailable due to Gemini API daily quota limits. "
                "You can proceed directly to the next question."
            )
        else:
            msg = f"AI follow-up rate limit exceeded. Please wait a few seconds before retrying: {str(exc)}"
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=msg,
            headers=headers,
        ) from exc
    except GeminiProviderError as exc:
        err_msg = str(exc)
        if "Gemini API key is not configured" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=err_msg,
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI follow-up provider error: {err_msg}",
        ) from exc
    except GeminiValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI follow-up output validation failed: {str(exc)}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during follow-up generation: {type(exc).__name__}",
        ) from exc

    # 5. Persist follow-up record
    fu_id = f"fq-{uuid.uuid4().hex[:12]}"
    new_follow_up = FollowUpQuestionModel(
        id=fu_id,
        session_id=session_record.id,
        primary_question_number=target_q_num,
        follow_up_number=next_follow_up_number,
        question_text=fu_output.question_text,
        expected_concepts=fu_output.expected_concepts,
        probing_reason=fu_output.probing_reason,
        created_at=datetime.now(timezone.utc),
    )

    try:
        db.add(new_follow_up)
        await db.commit()
        await db.refresh(new_follow_up)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction failed while saving follow-up question: {type(exc).__name__}",
        ) from exc

    return FollowUpQuestionResponse(
        status="generated",
        id=new_follow_up.id,
        session_id=new_follow_up.session_id,
        primary_question_number=new_follow_up.primary_question_number,
        follow_up_number=new_follow_up.follow_up_number,
        question_text=new_follow_up.question_text,
        expected_concepts=new_follow_up.expected_concepts,
        probing_reason=new_follow_up.probing_reason,
        candidate_answer=new_follow_up.candidate_answer,
        created_at=new_follow_up.created_at,
        answered_at=new_follow_up.answered_at,
    )


@router.post(
    "/{session_id}/follow-ups/{follow_up_id}/answer",
    response_model=FollowUpAnswerResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit candidate answer for an adaptive follow-up question",
)
async def submit_follow_up_answer(
    session_id: str,
    follow_up_id: str,
    request: FollowUpAnswerRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_optional_current_user),
) -> FollowUpAnswerResponse:
    """Submits and persists a candidate's answer for an adaptive follow-up question."""
    session_stmt = select(InterviewSessionModel).where(InterviewSessionModel.id == session_id)
    session_result = await db.execute(session_stmt)
    session_record = session_result.scalar_one_or_none()
    if session_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{session_id}' not found.",
        )

    verify_session_access(session_record, current_user)

    if session_record.status != SessionStatus.IN_PROGRESS.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Session '{session_id}' has status '{session_record.status}'. Only in_progress sessions accept answers.",
        )

    fu_stmt = select(FollowUpQuestionModel).where(FollowUpQuestionModel.id == follow_up_id)
    fu_result = await db.execute(fu_stmt)
    fu_record = fu_result.scalar_one_or_none()
    if fu_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Follow-up question '{follow_up_id}' not found.",
        )

    if fu_record.session_id != session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Follow-up question '{follow_up_id}' does not belong to session '{session_id}'.",
        )

    fu_record.candidate_answer = request.answer_text
    fu_record.answered_at = datetime.now(timezone.utc)

    try:
        await db.commit()
        await db.refresh(fu_record)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction failed while saving follow-up answer: {type(exc).__name__}",
        ) from exc

    return FollowUpAnswerResponse(
        status="answered",
        id=fu_record.id,
        session_id=fu_record.session_id,
        primary_question_number=fu_record.primary_question_number,
        follow_up_number=fu_record.follow_up_number,
        candidate_answer=fu_record.candidate_answer,
        answered_at=fu_record.answered_at,
        message="Follow-up answer submitted and persisted successfully.",
    )


@router.get(
    "/{session_id}/questions/{question_number}/follow-ups",
    response_model=List[FollowUpQuestionResponse],
    status_code=status.HTTP_200_OK,
    summary="List follow-up questions for a primary question",
)
async def list_follow_up_questions(
    session_id: str,
    question_number: int,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_optional_current_user),
) -> List[FollowUpQuestionResponse]:
    """Retrieves all generated follow-up questions and answers for a primary question."""
    session_stmt = select(InterviewSessionModel).where(InterviewSessionModel.id == session_id)
    session_result = await db.execute(session_stmt)
    session_record = session_result.scalar_one_or_none()
    if session_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{session_id}' not found.",
        )

    verify_session_access(session_record, current_user)
    stmt = (
        select(FollowUpQuestionModel)
        .where(
            FollowUpQuestionModel.session_id == session_id,
            FollowUpQuestionModel.primary_question_number == question_number,
        )
        .order_by(FollowUpQuestionModel.follow_up_number.asc())
    )
    result = await db.execute(stmt)
    records = result.scalars().all()
    return [
        FollowUpQuestionResponse(
            status="generated",
            id=r.id,
            session_id=r.session_id,
            primary_question_number=r.primary_question_number,
            follow_up_number=r.follow_up_number,
            question_text=r.question_text,
            expected_concepts=r.expected_concepts,
            probing_reason=r.probing_reason,
            candidate_answer=r.candidate_answer,
            created_at=r.created_at,
            answered_at=r.answered_at,
        )
        for r in records
    ]


@router.post(
    "/{session_id}/next",
    response_model=SessionAdvanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Advance to next primary question or complete the interview",
)
@router.post(
    "/{session_id}/advance",
    response_model=SessionAdvanceResponse,
    status_code=status.HTTP_200_OK,
    summary="Advance to next primary question or complete the interview (alias)",
)
async def advance_interview_question(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_optional_current_user),
) -> SessionAdvanceResponse:
    """Backend-authoritative progression to the next primary question or interview completion.

    Guards & Invariants:
    - 404: Session not found.
    - 409: Session already completed or not in in_progress state.
    - 409: Current primary question has no submitted answer.
    - 409: Any previously requested follow-up for the current question remains unanswered.
    - Concurrency-safe: Row-level lock (FOR UPDATE) prevents race conditions.
    - Completion: When current question is final (== question_count), marks session completed.
    - Failure handling: If next question generation fails (502/503), session remains at current state.
    """
    # 1. Row-level lock on session
    session_stmt = (
        select(InterviewSessionModel)
        .where(InterviewSessionModel.id == session_id)
        .with_for_update()
    )
    session_result = await db.execute(session_stmt)
    session_record = session_result.scalar_one_or_none()
    if session_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{session_id}' not found.",
        )

    verify_session_access(session_record, current_user)

    if session_record.status == SessionStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Interview session '{session_id}' is already completed and is read-only.",
        )

    if session_record.status != SessionStatus.IN_PROGRESS.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot advance: Session '{session_id}' is in status '{session_record.status}'. "
                f"Only sessions in '{SessionStatus.IN_PROGRESS.value}' state can advance."
            ),
        )

    # 2. Query existing primary questions to identify current question number
    pq_stmt = (
        select(PrimaryQuestionModel)
        .where(PrimaryQuestionModel.session_id == session_id)
        .order_by(PrimaryQuestionModel.question_number.asc())
    )
    pq_result = await db.execute(pq_stmt)
    existing_pqs = pq_result.scalars().all()
    current_q_num = existing_pqs[-1].question_number if existing_pqs else 1

    # 3. Guard: Current primary question MUST have a submitted answer
    ans_stmt = (
        select(CandidateAnswerModel)
        .where(
            CandidateAnswerModel.session_id == session_id,
            CandidateAnswerModel.question_number == current_q_num,
        )
    )
    ans_res = await db.execute(ans_stmt)
    primary_answer = ans_res.scalars().first()
    if primary_answer is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Cannot advance: Primary question #{current_q_num} has not been answered yet. "
                "Please submit your answer before advancing to the next question."
            ),
        )

    # 4. Guard: Every requested follow-up for the current question MUST be answered
    fu_stmt = (
        select(FollowUpQuestionModel)
        .where(
            FollowUpQuestionModel.session_id == session_id,
            FollowUpQuestionModel.primary_question_number == current_q_num,
        )
        .order_by(FollowUpQuestionModel.follow_up_number.asc())
    )
    fu_res = await db.execute(fu_stmt)
    existing_fus = fu_res.scalars().all()
    for fu in existing_fus:
        if not fu.candidate_answer or not fu.candidate_answer.strip():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    f"Cannot advance: Follow-up question #{fu.follow_up_number} for Question #{current_q_num} "
                    "is still unanswered. All requested follow-up questions must be answered before advancing."
                ),
            )

    # 5. Check if current question is the final question -> Complete session
    if current_q_num >= session_record.question_count:
        session_record.status = SessionStatus.COMPLETED.value
        try:
            await db.commit()
            await db.refresh(session_record)
        except Exception as exc:
            await db.rollback()
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Database transaction failed while completing interview: {type(exc).__name__}",
            ) from exc

        return SessionAdvanceResponse(
            status=SessionStatus.COMPLETED,
            session_id=session_record.id,
            current_question=None,
            question_number=session_record.question_count,
            total_questions=session_record.question_count,
            is_completed=True,
            message=(
                f"Interview session completed successfully! All {session_record.question_count} "
                "primary questions and all required turns have been finished."
            ),
            advanced_at=datetime.now(timezone.utc),
        )

    # 6. Generate next primary question (current_q_num + 1)
    next_q_num = current_q_num + 1
    previous_topics = [pq.topic for pq in existing_pqs]

    try:
        next_question = await generate_interview_question(
            role=session_record.role,
            difficulty=SeniorityLevel(session_record.difficulty),
            primary_language=CodingLanguage(session_record.primary_language),
            question_number=next_q_num,
            previous_topics=previous_topics,
            allow_offline=True,
        )
    except GeminiQuotaExceededError as exc:
        retry_delay = int(exc.retry_after or (3600 if getattr(exc, "is_quota_exhausted", False) else 5))
        headers = {"Retry-After": str(retry_delay)}
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"AI rate limit exceeded during question progression: {str(exc)}",
            headers=headers,
        ) from exc
    except GeminiProviderError as exc:
        err_msg = str(exc)
        if "Gemini API key is not configured" in err_msg:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=err_msg,
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI question generation provider error: {err_msg}",
        ) from exc
    except GeminiValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI question validation error: {str(exc)}",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during next question generation: {type(exc).__name__}",
        ) from exc

    # 7. Persist next primary question
    new_pq = PrimaryQuestionModel(
        id=f"pq-{uuid.uuid4().hex[:12]}",
        session_id=session_record.id,
        question_number=next_q_num,
        topic=next_question.topic,
        difficulty=next_question.difficulty.value if hasattr(next_question.difficulty, "value") else str(next_question.difficulty),
        question_text=next_question.question_text,
        starter_code=next_question.starter_code,
        expected_concepts=next_question.expected_concepts,
        created_at=datetime.now(timezone.utc),
    )

    try:
        db.add(new_pq)
        await db.commit()
        await db.refresh(new_pq)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database transaction failed while saving next question: {type(exc).__name__}",
        ) from exc

    return SessionAdvanceResponse(
        status=SessionStatus.IN_PROGRESS,
        session_id=session_record.id,
        current_question=next_question,
        question_number=next_q_num,
        total_questions=session_record.question_count,
        is_completed=False,
        message=f"Advanced to Question {next_q_num} of {session_record.question_count}.",
        advanced_at=new_pq.created_at,
    )


@router.get(
    "/{session_id}/questions",
    response_model=List[PrimaryQuestionResponse],
    status_code=status.HTTP_200_OK,
    summary="List persisted primary questions for an interview session",
)
async def list_primary_questions(
    session_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_optional_current_user),
) -> List[PrimaryQuestionResponse]:
    """Retrieves all generated primary questions for a session in order."""
    session_stmt = select(InterviewSessionModel).where(InterviewSessionModel.id == session_id)
    session_result = await db.execute(session_stmt)
    session_record = session_result.scalar_one_or_none()
    if session_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{session_id}' not found.",
        )

    verify_session_access(session_record, current_user)

    stmt = (
        select(PrimaryQuestionModel)
        .where(PrimaryQuestionModel.session_id == session_id)
        .order_by(PrimaryQuestionModel.question_number.asc())
    )
    result = await db.execute(stmt)
    records = result.scalars().all()
    return [
        PrimaryQuestionResponse(
            id=r.id,
            session_id=r.session_id,
            question_number=r.question_number,
            topic=r.topic,
            difficulty=SeniorityLevel(r.difficulty),
            question_text=r.question_text,
            starter_code=r.starter_code,
            expected_concepts=r.expected_concepts,
            created_at=r.created_at,
        )
        for r in records
    ]


@router.get(
    "/{session_id}/report",
    response_model=InterviewReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Retrieve or generate the final interview report for a completed session",
)
@router.post(
    "/{session_id}/report",
    response_model=InterviewReportResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate or retrieve the final interview report for a completed session",
)
async def get_or_generate_interview_report(
    session_id: str,
    refresh: bool = False,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_optional_current_user),
) -> InterviewReportResponse:
    """Retrieves or synthesizes the final aggregated report for a completed interview.

    Requirements:
    - 404 if session does not exist.
    - 409 if session is not in 'completed' state.
    - Idempotent: returns existing persisted report unless refresh=True.
    - Backend-authoritative score calculation across 4 dimensions:
      Correctness (40%), Technical Depth (25%), Edge Cases (20%), Communication (15%).
    - Explicitly distinguishes missing evaluations from zero scores.
    - Never fabricates answers, scores, or absent feedback.
    """
    # 1. Fetch and validate session existence and completed status
    session_stmt = select(InterviewSessionModel).where(InterviewSessionModel.id == session_id)
    session_res = await db.execute(session_stmt)
    session_record = session_res.scalar_one_or_none()
    if session_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{session_id}' not found.",
        )

    verify_session_access(session_record, current_user)

    if session_record.status != SessionStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"Interview session '{session_id}' is not completed "
                f"(current status: '{session_record.status}'). Reports are only available for completed sessions."
            ),
        )

    # 2. Check existing report (idempotent lookup)
    report_stmt = select(InterviewReportModel).where(InterviewReportModel.session_id == session_id)
    report_res = await db.execute(report_stmt)
    existing_report = report_res.scalar_one_or_none()

    if existing_report is not None and not refresh:
        return InterviewReportResponse(
            status="completed",
            report_id=existing_report.id,
            session_id=existing_report.session_id,
            role=session_record.role,
            difficulty=session_record.difficulty,
            primary_language=session_record.primary_language,
            total_questions=existing_report.total_questions,
            answered_questions=existing_report.answered_questions,
            evaluated_questions=existing_report.evaluated_questions,
            scores=ScoreBreakdown(
                correctness_average=existing_report.correctness_average,
                technical_depth_average=existing_report.technical_depth_average,
                edge_cases_average=existing_report.edge_cases_average,
                communication_average=existing_report.communication_average,
                overall_score=existing_report.overall_score,
            ),
            overall_score=existing_report.overall_score,
            performance_rating=existing_report.performance_rating,
            summary_narrative=existing_report.summary_narrative,
            strengths=existing_report.strengths or [],
            improvement_areas=existing_report.improvement_areas or [],
            study_recommendations=existing_report.study_recommendations or [],
            per_question_results=[
                QuestionReportItem.model_validate(q)
                for q in (existing_report.per_question_results or [])
            ],
            created_at=existing_report.created_at,
            updated_at=existing_report.updated_at,
        )

    # 3. Load all persisted questions, answers, evaluations, and follow-ups
    pq_stmt = (
        select(PrimaryQuestionModel)
        .where(PrimaryQuestionModel.session_id == session_id)
        .order_by(PrimaryQuestionModel.question_number.asc())
    )
    pq_res = await db.execute(pq_stmt)
    primary_questions = pq_res.scalars().all()

    ans_stmt = (
        select(CandidateAnswerModel)
        .where(CandidateAnswerModel.session_id == session_id)
        .order_by(CandidateAnswerModel.question_number.asc())
    )
    ans_res = await db.execute(ans_stmt)
    answers = ans_res.scalars().all()

    eval_stmt = select(AnswerEvaluationModel).where(AnswerEvaluationModel.session_id == session_id)
    eval_res = await db.execute(eval_stmt)
    evaluations = eval_res.scalars().all()

    fu_stmt = (
        select(FollowUpQuestionModel)
        .where(FollowUpQuestionModel.session_id == session_id)
        .order_by(
            FollowUpQuestionModel.primary_question_number.asc(),
            FollowUpQuestionModel.follow_up_number.asc(),
        )
    )
    fu_res = await db.execute(fu_stmt)
    follow_ups = fu_res.scalars().all()

    # Index by question number / answer id
    answers_by_q = {a.question_number: a for a in answers}
    evals_by_answer_id = {e.answer_id: e for e in evaluations}
    follow_ups_by_q = defaultdict(list)
    for fu in follow_ups:
        follow_ups_by_q[fu.primary_question_number].append(fu)

    # 4. Dimension score calculations
    evaluated_items = [evals_by_answer_id[a.id] for a in answers if a.id in evals_by_answer_id]
    total_q = session_record.question_count
    answered_q = len(answers)
    evaluated_q = len(evaluated_items)

    if evaluated_q > 0:
        correctness_avg = round(sum(e.correctness_score for e in evaluated_items) / evaluated_q, 2)
        tech_depth_avg = round(sum(e.technical_depth_score for e in evaluated_items) / evaluated_q, 2)
        edge_cases_avg = round(sum(e.edge_cases_score for e in evaluated_items) / evaluated_q, 2)
        comm_avg = round(sum(e.communication_score for e in evaluated_items) / evaluated_q, 2)
        overall_score = calculate_weighted_overall_score(
            correctness=correctness_avg,
            technical_depth=tech_depth_avg,
            edge_cases=edge_cases_avg,
            communication=comm_avg,
        )
        if overall_score >= 8.5:
            performance_rating = "Excellent (Strong Pass)"
        elif overall_score >= 7.0:
            performance_rating = "Proficient (Pass)"
        elif overall_score >= 5.0:
            performance_rating = "Developing"
        else:
            performance_rating = "Needs Improvement"
    else:
        correctness_avg = None
        tech_depth_avg = None
        edge_cases_avg = None
        comm_avg = None
        overall_score = None
        performance_rating = "Not Evaluated"

    # 5. Build per-question detailed results
    per_question_results: List[QuestionReportItem] = []
    # Use persisted primary questions or construct sequential placeholders if unpersisted
    q_items = (
        primary_questions
        if primary_questions
        else [
            PrimaryQuestionModel(
                id=f"pq-{session_id}-{idx}",
                session_id=session_id,
                question_number=idx,
                topic=f"Technical Challenge #{idx}",
                difficulty=session_record.difficulty,
                question_text=f"Question #{idx} prompt",
                starter_code=None,
                expected_concepts=[],
                created_at=datetime.now(timezone.utc),
            )
            for idx in range(1, total_q + 1)
        ]
    )

    for pq in q_items:
        ans = answers_by_q.get(pq.question_number)
        ev = evals_by_answer_id.get(ans.id) if ans else None
        fu_list = [
            {
                "id": fu.id,
                "follow_up_number": fu.follow_up_number,
                "question_text": fu.question_text,
                "expected_concepts": fu.expected_concepts or [],
                "candidate_answer": fu.candidate_answer,
                "answered_at": fu.answered_at.isoformat() if fu.answered_at else None,
                "probing_reason": fu.probing_reason,
            }
            for fu in follow_ups_by_q.get(pq.question_number, [])
        ]

        per_question_results.append(
            QuestionReportItem(
                question_number=pq.question_number,
                topic=pq.topic,
                difficulty=pq.difficulty,
                question_text=pq.question_text,
                starter_code=pq.starter_code,
                expected_concepts=pq.expected_concepts or [],
                is_answered=ans is not None,
                answer_text=ans.answer_text if ans else None,
                submitted_at=ans.submitted_at if ans else None,
                is_evaluated=ev is not None,
                correctness_score=ev.correctness_score if ev else None,
                technical_depth_score=ev.technical_depth_score if ev else None,
                edge_cases_score=ev.edge_cases_score if ev else None,
                communication_score=ev.communication_score if ev else None,
                overall_score=ev.overall_score if ev else None,
                feedback=ev.feedback if ev else None,
                strengths=ev.strengths or [] if ev else [],
                missing_concepts=ev.missing_concepts or [] if ev else [],
                suggestions=ev.suggestions or [] if ev else [],
                follow_ups=fu_list,
            )
        )

    # 6. Aggregate unique strengths, missing concepts, and recommendations
    agg_strengths: List[str] = []
    agg_gaps: List[str] = []
    agg_suggestions: List[str] = []
    for ev in evaluated_items:
        for s in (ev.strengths or []):
            if s and s not in agg_strengths:
                agg_strengths.append(s)
        for m in (ev.missing_concepts or []):
            if m and m not in agg_gaps:
                agg_gaps.append(m)
        for sg in (ev.suggestions or []):
            if sg and sg not in agg_suggestions:
                agg_suggestions.append(sg)

    # 7. Generate or synthesize narrative
    topics = [pq.topic for pq in q_items if pq.topic]
    scores_dict = {
        "correctness": correctness_avg,
        "technical_depth": tech_depth_avg,
        "edge_cases": edge_cases_avg,
        "communication": comm_avg,
    }

    try:
        narrative_out = await generate_report_narrative(
            role=session_record.role,
            difficulty=SeniorityLevel(session_record.difficulty),
            primary_language=CodingLanguage(session_record.primary_language),
            total_questions=total_q,
            answered_questions=answered_q,
            evaluated_questions=evaluated_q,
            overall_score=overall_score,
            scores=scores_dict,
            topics=topics,
            aggregated_strengths=agg_strengths,
            aggregated_missing_concepts=agg_gaps,
            aggregated_suggestions=agg_suggestions,
            performance_rating=performance_rating,
            allow_fallback=True,
        )
    except Exception as exc:
        # Fallback to local deterministic synthesis on any unexpected error
        narrative_out = synthesize_deterministic_report_narrative(
            role=session_record.role,
            difficulty=SeniorityLevel(session_record.difficulty),
            primary_language=CodingLanguage(session_record.primary_language),
            total_questions=total_q,
            answered_questions=answered_q,
            evaluated_questions=evaluated_q,
            overall_score=overall_score,
            performance_rating=performance_rating,
            topics=topics,
            aggregated_strengths=agg_strengths,
            aggregated_missing_concepts=agg_gaps,
            aggregated_suggestions=agg_suggestions,
        )

    # 8. Persist report record in interview_reports
    now = datetime.now(timezone.utc)
    pq_dicts = [q.model_dump(mode="json") for q in per_question_results]

    if existing_report is not None:
        report_record = existing_report
        report_record.overall_score = overall_score
        report_record.correctness_average = correctness_avg
        report_record.technical_depth_average = tech_depth_avg
        report_record.edge_cases_average = edge_cases_avg
        report_record.communication_average = comm_avg
        report_record.total_questions = total_q
        report_record.answered_questions = answered_q
        report_record.evaluated_questions = evaluated_q
        report_record.performance_rating = performance_rating
        report_record.summary_narrative = narrative_out.summary_narrative
        report_record.strengths = narrative_out.strengths or agg_strengths
        report_record.improvement_areas = narrative_out.improvement_areas or agg_gaps
        report_record.study_recommendations = narrative_out.study_recommendations or agg_suggestions
        report_record.per_question_results = pq_dicts
        report_record.updated_at = now
    else:
        report_record = InterviewReportModel(
            id=f"rep-{uuid.uuid4().hex[:12]}",
            session_id=session_id,
            overall_score=overall_score,
            correctness_average=correctness_avg,
            technical_depth_average=tech_depth_avg,
            edge_cases_average=edge_cases_avg,
            communication_average=comm_avg,
            total_questions=total_q,
            answered_questions=answered_q,
            evaluated_questions=evaluated_q,
            performance_rating=performance_rating,
            summary_narrative=narrative_out.summary_narrative,
            strengths=narrative_out.strengths or agg_strengths,
            improvement_areas=narrative_out.improvement_areas or agg_gaps,
            study_recommendations=narrative_out.study_recommendations or agg_suggestions,
            per_question_results=pq_dicts,
            created_at=now,
            updated_at=now,
        )
        db.add(report_record)

    try:
        await db.commit()
        await db.refresh(report_record)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error while saving final report: {exc}",
        ) from exc

    return InterviewReportResponse(
        status="completed",
        report_id=report_record.id,
        session_id=report_record.session_id,
        role=session_record.role,
        difficulty=session_record.difficulty,
        primary_language=session_record.primary_language,
        total_questions=report_record.total_questions,
        answered_questions=report_record.answered_questions,
        evaluated_questions=report_record.evaluated_questions,
        scores=ScoreBreakdown(
            correctness_average=report_record.correctness_average,
            technical_depth_average=report_record.technical_depth_average,
            edge_cases_average=report_record.edge_cases_average,
            communication_average=report_record.communication_average,
            overall_score=report_record.overall_score,
        ),
        overall_score=report_record.overall_score,
        performance_rating=report_record.performance_rating,
        summary_narrative=report_record.summary_narrative,
        strengths=report_record.strengths or [],
        improvement_areas=report_record.improvement_areas or [],
        study_recommendations=report_record.study_recommendations or [],
        per_question_results=[
            QuestionReportItem.model_validate(q)
            for q in (report_record.per_question_results or [])
        ],
        created_at=report_record.created_at,
        updated_at=report_record.updated_at,
    )


@router.post(
    "/{session_id}/voice/session",
    response_model=VoiceSessionResponse,
    status_code=status.HTTP_200_OK,
    summary="Issue ephemeral credentials for browser WebRTC real-time voice interview",
)
async def create_voice_session(
    session_id: str,
    voice_req: Optional[VoiceSessionRequest] = None,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_optional_current_user),
) -> VoiceSessionResponse:
    """Creates a short-lived client token for OpenAI Realtime API WebRTC connection.

    Security & Authorization Guards:
    - Verifies session exists (404 Not Found if missing).
    - Verifies session access ownership (401 Unauthorized if unauthenticated on user session,
      403 Forbidden if accessing another user's session).
    - Rejects completed sessions (409 Conflict).
    - Ensures technical challenge question exists for this session (400 Bad Request if session unstarted).
    - Ephemeral client secret is generated server-side; master API key is never exposed to browser.
    """
    stmt = select(InterviewSessionModel).where(InterviewSessionModel.id == session_id)
    res = await db.execute(stmt)
    session_record = res.scalar_one_or_none()

    if session_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{session_id}' not found.",
        )

    verify_session_access(session_record, current_user)

    if session_record.status == SessionStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot initiate a voice session for an interview that has already been completed.",
        )

    # Locate technical challenge question to ground the interviewer
    if voice_req and voice_req.question_number:
        pq_stmt = select(PrimaryQuestionModel).where(
            PrimaryQuestionModel.session_id == session_id,
            PrimaryQuestionModel.question_number == voice_req.question_number,
        )
    else:
        pq_stmt = (
            select(PrimaryQuestionModel)
            .where(PrimaryQuestionModel.session_id == session_id)
            .order_by(PrimaryQuestionModel.question_number.desc())
        )

    pq_res = await db.execute(pq_stmt)
    pq = pq_res.scalars().first()

    if not pq:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No technical question found for this interview session. Please start the interview session first.",
        )

    try:
        session_data = await request_realtime_session(
            role=session_record.role,
            difficulty=session_record.difficulty,
            language=session_record.primary_language,
            question_text=pq.question_text,
            topic=pq.topic,
        )
    except VoiceServiceNotConfiguredError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except VoiceServiceProviderError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error creating voice session: {type(exc).__name__}",
        ) from exc

    return VoiceSessionResponse(
        session_id=session_record.id,
        client_secret=session_data["client_secret"],
        expires_at=session_data.get("expires_at"),
        model=session_data["model"],
        voice=session_data["voice"],
        question_number=pq.question_number,
        question_text=pq.question_text,
        topic=pq.topic,
        role=session_record.role,
        difficulty=session_record.difficulty,
    )


@router.post(
    "/{session_id}/voice/interact",
    response_model=VoiceInteractionResponse,
    status_code=status.HTTP_200_OK,
    summary="Zero-cost conversational voice turn using browser speech and resilient AI follow-up",
)
async def interact_voice_session(
    session_id: str,
    interaction_req: VoiceInteractionRequest,
    db: AsyncSession = Depends(get_db),
    current_user: Optional[UserModel] = Depends(get_optional_current_user),
) -> VoiceInteractionResponse:
    """Processes candidate spoken explanation and generates a concise technical interviewer spoken response.

    Zero-cost & Free Quota Resilient:
    - ₹0 paid voice API cost (runs with browser Web Speech API).
    - If Gemini API quota is available, provides dynamic AI follow-up.
    - If Gemini API quota is exhausted or unconfigured, falls back deterministically to offline technical
      follow-up prompts grounded in the question's expected architectural concepts.
    - Authoritative interview state remains anchored to the database.
    """
    stmt = select(InterviewSessionModel).where(InterviewSessionModel.id == session_id)
    res = await db.execute(stmt)
    session_record = res.scalar_one_or_none()

    if session_record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Interview session '{session_id}' not found.",
        )

    verify_session_access(session_record, current_user)

    if session_record.status == SessionStatus.COMPLETED.value:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Cannot interact in voice mode for an interview that has already been completed.",
        )

    # Locate technical challenge question to ground the interviewer
    if interaction_req.question_number:
        pq_stmt = select(PrimaryQuestionModel).where(
            PrimaryQuestionModel.session_id == session_id,
            PrimaryQuestionModel.question_number == interaction_req.question_number,
        )
    else:
        pq_stmt = (
            select(PrimaryQuestionModel)
            .where(PrimaryQuestionModel.session_id == session_id)
            .order_by(PrimaryQuestionModel.question_number.desc())
        )

    pq_res = await db.execute(pq_stmt)
    pq = pq_res.scalars().first()

    if not pq:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No technical question found for this interview session. Please start the interview session first.",
        )

    reply_text, is_offline = await generate_voice_conversational_reply(
        role=session_record.role,
        difficulty=session_record.difficulty,
        language=session_record.primary_language,
        question_text=pq.question_text,
        topic=pq.topic,
        candidate_speech=interaction_req.candidate_speech,
        expected_concepts=pq.expected_concepts,
    )

    return VoiceInteractionResponse(
        session_id=session_record.id,
        question_number=pq.question_number,
        interviewer_reply=reply_text,
        is_offline=is_offline,
    )

