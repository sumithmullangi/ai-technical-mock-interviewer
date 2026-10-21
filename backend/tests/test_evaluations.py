import pytest
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models.interview import (
    AnswerEvaluationModel,
    CandidateAnswerModel,
    InterviewSessionModel,
)
from app.schemas.interview import (
    GeminiEvaluationOutput,
    calculate_weighted_overall_score,
)
from app.services.gemini_service import (
    GeminiProviderError,
    GeminiQuotaExceededError,
    GeminiValidationError,
)

client = TestClient(app)


def test_calculate_weighted_overall_score_accuracy():
    """Verify backend calculation of weighted overall score across the 4 dimensions."""
    # Correctness: 40%, Technical Depth: 25%, Edge Cases: 20%, Communication: 15%
    # 8.0 * 0.40 = 3.20
    # 7.0 * 0.25 = 1.75
    # 6.0 * 0.20 = 1.20
    # 9.0 * 0.15 = 1.35
    # Total = 7.50
    score = calculate_weighted_overall_score(
        correctness=8.0,
        technical_depth=7.0,
        edge_cases=6.0,
        communication=9.0,
    )
    assert score == 7.50

    # Boundaries: 0.0 and 10.0
    assert calculate_weighted_overall_score(0.0, 0.0, 0.0, 0.0) == 0.0
    assert calculate_weighted_overall_score(10.0, 10.0, 10.0, 10.0) == 10.0


def test_calculate_weighted_overall_score_out_of_range():
    """Verify that scores outside [0.0, 10.0] are strictly rejected."""
    with pytest.raises(ValueError, match="Score 'correctness' must be between 0.0 and 10.0"):
        calculate_weighted_overall_score(11.0, 5.0, 5.0, 5.0)

    with pytest.raises(ValueError, match="Score 'edge_cases' must be between 0.0 and 10.0"):
        calculate_weighted_overall_score(8.0, 5.0, -0.5, 5.0)


def test_evaluate_answer_success():
    """Verify successfully evaluating a persisted answer and saving the evaluation record."""
    active_session = InterviewSessionModel(
        id="mock-eval-101",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    candidate_answer = CandidateAnswerModel(
        id="ans-eval-101",
        session_id="mock-eval-101",
        question_number=1,
        answer_text="I will use a sliding window with a dictionary.",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    # 1. session query, 2. answer query, 3. existing eval query
    session_result = MagicMock()
    session_result.scalar_one_or_none.return_value = active_session

    answer_result = MagicMock()
    answer_result.scalar_one_or_none.return_value = candidate_answer

    eval_result = MagicMock()
    eval_result.scalar_one_or_none.return_value = None

    mock_session.execute = AsyncMock(side_effect=[session_result, answer_result, eval_result])
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()

    mock_eval_output = GeminiEvaluationOutput(
        correctness=8.0,
        technical_depth=7.0,
        edge_cases=6.0,
        communication=9.0,
        feedback="Solid algorithmic reasoning with good time complexity analysis.",
        strengths=["O(N) time complexity", "Clean variable naming"],
        missing_concepts=["Unicode edge case handling"],
        suggestions=["Discuss space complexity when input charset is unbounded."],
    )

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        with patch(
            "app.api.v1.endpoints.interviews.evaluate_candidate_answer",
            new=AsyncMock(return_value=(mock_eval_output, 7.5)),
        ):
            res = client.post(
                "/api/v1/interviews/mock-eval-101/answers/ans-eval-101/evaluate",
                json={
                    "question_text": "Find length of longest substring without repeating characters",
                    "expected_concepts": ["Sliding Window", "Hash Map"],
                },
            )
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "evaluated"
            assert data["evaluation_id"].startswith("eval-")
            assert data["answer_id"] == "ans-eval-101"
            assert data["session_id"] == "mock-eval-101"
            assert data["overall_score"] == 7.5
            assert data["scores"]["correctness"] == 8.0
            assert data["scores"]["technical_depth"] == 7.0
            assert data["scores"]["edge_cases"] == 6.0
            assert data["scores"]["communication"] == 9.0
            assert "Solid algorithmic reasoning" in data["feedback"]
            assert "O(N) time complexity" in data["strengths"]
            assert "Unicode edge case handling" in data["missing_concepts"]
            assert len(data["suggestions"]) > 0

            # Verify persisted database record
            mock_session.add.assert_called_once()
            saved_eval = mock_session.add.call_args[0][0]
            assert isinstance(saved_eval, AnswerEvaluationModel)
            assert saved_eval.answer_id == "ans-eval-101"
            assert saved_eval.overall_score == 7.5
            mock_session.commit.assert_awaited_once()
    finally:
        app.dependency_overrides.clear()


def test_evaluate_answer_gemini_unconfigured_error():
    """Verify that unconfigured Gemini returns an explicit actionable error without fake mock."""
    active_session = InterviewSessionModel(
        id="mock-eval-unconf",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    candidate_answer = CandidateAnswerModel(
        id="ans-eval-unconf",
        session_id="mock-eval-unconf",
        question_number=1,
        answer_text="def solve(): pass",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    session_res = MagicMock()
    session_res.scalar_one_or_none.return_value = active_session
    answer_res = MagicMock()
    answer_res.scalar_one_or_none.return_value = candidate_answer
    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(side_effect=[session_res, answer_res, eval_res])

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        with patch.object(settings, "GEMINI_API_KEY", ""):
            res = client.post("/api/v1/interviews/mock-eval-unconf/answers/ans-eval-unconf/evaluate")
            assert res.status_code == 503
            data = res.json()
            assert "Gemini API key is not configured" in data["detail"]
    finally:
        app.dependency_overrides.clear()


def test_evaluate_answer_malformed_json_502():
    """Verify that malformed Gemini JSON output returns 502 Bad Gateway."""
    active_session = InterviewSessionModel(
        id="mock-eval-malformed",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    candidate_answer = CandidateAnswerModel(
        id="ans-eval-malformed",
        session_id="mock-eval-malformed",
        question_number=1,
        answer_text="print('hello')",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    session_res = MagicMock()
    session_res.scalar_one_or_none.return_value = active_session
    answer_res = MagicMock()
    answer_res.scalar_one_or_none.return_value = candidate_answer
    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(side_effect=[session_res, answer_res, eval_res])

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        with patch(
            "app.api.v1.endpoints.interviews.evaluate_candidate_answer",
            side_effect=GeminiValidationError("Invalid JSON: Unterminated string"),
        ):
            res = client.post("/api/v1/interviews/mock-eval-malformed/answers/ans-eval-malformed/evaluate")
            assert res.status_code == 502
            assert "AI evaluation validation error" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_evaluate_answer_out_of_range_score_502():
    """Verify that out-of-range dimension scores from Gemini return 502 Bad Gateway."""
    active_session = InterviewSessionModel(
        id="mock-eval-outofrange",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    candidate_answer = CandidateAnswerModel(
        id="ans-eval-outofrange",
        session_id="mock-eval-outofrange",
        question_number=1,
        answer_text="def test(): pass",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    session_res = MagicMock()
    session_res.scalar_one_or_none.return_value = active_session
    answer_res = MagicMock()
    answer_res.scalar_one_or_none.return_value = candidate_answer
    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(side_effect=[session_res, answer_res, eval_res])

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        with patch(
            "app.api.v1.endpoints.interviews.evaluate_candidate_answer",
            side_effect=GeminiValidationError("Score 'correctness' must be between 0.0 and 10.0, got 15.0"),
        ):
            res = client.post("/api/v1/interviews/mock-eval-outofrange/answers/ans-eval-outofrange/evaluate")
            assert res.status_code == 502
            assert "AI evaluation validation error" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_evaluate_answer_missing_session_404():
    """Verify 404 when evaluating an answer for a nonexistent session."""
    mock_session = AsyncMock(spec=AsyncSession)
    session_res = MagicMock()
    session_res.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(return_value=session_res)

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-missing-session/answers/ans-101/evaluate")
        assert res.status_code == 404
        assert "Interview session 'mock-missing-session' not found." in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_evaluate_answer_missing_answer_404():
    """Verify 404 when the specified answer does not exist."""
    active_session = InterviewSessionModel(
        id="mock-eval-exists",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    session_res = MagicMock()
    session_res.scalar_one_or_none.return_value = active_session

    answer_res = MagicMock()
    answer_res.scalar_one_or_none.return_value = None

    mock_session.execute = AsyncMock(side_effect=[session_res, answer_res])

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-eval-exists/answers/ans-missing/evaluate")
        assert res.status_code == 404
        assert "Candidate answer 'ans-missing' not found." in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_evaluate_answer_wrong_session_answer_404():
    """Verify 404 when answer belongs to a different session."""
    active_session = InterviewSessionModel(
        id="mock-session-A",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    answer_from_session_b = CandidateAnswerModel(
        id="ans-session-B",
        session_id="mock-session-B",
        question_number=1,
        answer_text="def other(): pass",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    session_res = MagicMock()
    session_res.scalar_one_or_none.return_value = active_session
    answer_res = MagicMock()
    answer_res.scalar_one_or_none.return_value = answer_from_session_b
    mock_session.execute = AsyncMock(side_effect=[session_res, answer_res])

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-session-A/answers/ans-session-B/evaluate")
        assert res.status_code == 404
        assert "does not belong to session 'mock-session-A'" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_evaluate_answer_duplicate_conflict_409():
    """Verify 409 Conflict when attempting to evaluate an already evaluated answer."""
    active_session = InterviewSessionModel(
        id="mock-eval-dup",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    candidate_answer = CandidateAnswerModel(
        id="ans-eval-dup",
        session_id="mock-eval-dup",
        question_number=1,
        answer_text="def test(): pass",
        submitted_at=datetime.now(timezone.utc),
    )
    existing_eval = AnswerEvaluationModel(
        id="eval-already-done",
        answer_id="ans-eval-dup",
        session_id="mock-eval-dup",
        correctness_score=9.0,
        technical_depth_score=8.5,
        edge_cases_score=8.0,
        communication_score=9.0,
        overall_score=8.7,
        feedback="Already evaluated",
        strengths=["Great work"],
        missing_concepts=[],
        suggestions=[],
    )

    mock_session = AsyncMock(spec=AsyncSession)
    session_res = MagicMock()
    session_res.scalar_one_or_none.return_value = active_session
    answer_res = MagicMock()
    answer_res.scalar_one_or_none.return_value = candidate_answer
    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = existing_eval
    mock_session.execute = AsyncMock(side_effect=[session_res, answer_res, eval_res])

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-eval-dup/answers/ans-eval-dup/evaluate")
        assert res.status_code == 409
        assert "already been evaluated" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_evaluate_answer_gemini_network_failure_502():
    """Verify 502 Bad Gateway when Gemini network request fails."""
    active_session = InterviewSessionModel(
        id="mock-eval-neterr",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    candidate_answer = CandidateAnswerModel(
        id="ans-eval-neterr",
        session_id="mock-eval-neterr",
        question_number=1,
        answer_text="def test(): pass",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    session_res = MagicMock()
    session_res.scalar_one_or_none.return_value = active_session
    answer_res = MagicMock()
    answer_res.scalar_one_or_none.return_value = candidate_answer
    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(side_effect=[session_res, answer_res, eval_res])

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        with patch(
            "app.api.v1.endpoints.interviews.evaluate_candidate_answer",
            side_effect=GeminiProviderError("Network connection timeout"),
        ):
            res = client.post("/api/v1/interviews/mock-eval-neterr/answers/ans-eval-neterr/evaluate")
            assert res.status_code == 502
            assert "AI evaluation service provider error" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_evaluate_answer_gemini_quota_exceeded_returns_429():
    """Verify HTTP 429 and Retry-After header are returned when Gemini API quota is exhausted."""
    active_session = InterviewSessionModel(
        id="mock-eval-quota",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    candidate_answer = CandidateAnswerModel(
        id="ans-eval-quota",
        session_id="mock-eval-quota",
        question_number=1,
        answer_text="def test(): pass",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    session_res = MagicMock()
    session_res.scalar_one_or_none.return_value = active_session
    answer_res = MagicMock()
    answer_res.scalar_one_or_none.return_value = candidate_answer
    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(side_effect=[session_res, answer_res, eval_res])

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        with patch(
            "app.api.v1.endpoints.interviews.evaluate_candidate_answer",
            side_effect=GeminiQuotaExceededError("Gemini API rate limit exceeded (HTTP 429)", retry_after=15.0),
        ):
            res = client.post("/api/v1/interviews/mock-eval-quota/answers/ans-eval-quota/evaluate")
            assert res.status_code == 429
            assert res.headers.get("retry-after") == "15"
            assert "Gemini API rate limit exceeded" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_evaluate_answer_database_rollback_on_failure():
    """Verify database rollback when committing the evaluation record fails."""
    active_session = InterviewSessionModel(
        id="mock-eval-dberr",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    candidate_answer = CandidateAnswerModel(
        id="ans-eval-dberr",
        session_id="mock-eval-dberr",
        question_number=1,
        answer_text="def test(): pass",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    session_res = MagicMock()
    session_res.scalar_one_or_none.return_value = active_session
    answer_res = MagicMock()
    answer_res.scalar_one_or_none.return_value = candidate_answer
    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(side_effect=[session_res, answer_res, eval_res])
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock(side_effect=Exception("Database connection terminated"))
    mock_session.rollback = AsyncMock()

    mock_eval_output = GeminiEvaluationOutput(
        correctness=8.0,
        technical_depth=8.0,
        edge_cases=8.0,
        communication=8.0,
        feedback="Good answer",
        strengths=["Clear logic"],
        missing_concepts=[],
        suggestions=[],
    )

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        with patch(
            "app.api.v1.endpoints.interviews.evaluate_candidate_answer",
            new=AsyncMock(return_value=(mock_eval_output, 8.0)),
        ):
            res = client.post("/api/v1/interviews/mock-eval-dberr/answers/ans-eval-dberr/evaluate")
            assert res.status_code == 500
            assert "Database transaction failed while saving evaluation" in res.json()["detail"]
            mock_session.rollback.assert_awaited_once()
    finally:
        app.dependency_overrides.clear()


def test_evaluate_answer_alias_endpoint():
    """Verify evaluation via body-based alias endpoint POST /api/v1/interviews/{session_id}/evaluate."""
    active_session = InterviewSessionModel(
        id="mock-eval-alias",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    candidate_answer = CandidateAnswerModel(
        id="ans-eval-alias",
        session_id="mock-eval-alias",
        question_number=1,
        answer_text="def solve(): return 42",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    session_res = MagicMock()
    session_res.scalar_one_or_none.return_value = active_session
    answer_res = MagicMock()
    answer_res.scalar_one_or_none.return_value = candidate_answer
    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(side_effect=[session_res, answer_res, eval_res])
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()

    mock_eval_output = GeminiEvaluationOutput(
        correctness=9.0,
        technical_depth=9.0,
        edge_cases=8.0,
        communication=9.0,
        feedback="Exceptional solution",
        strengths=["Optimal complexity"],
        missing_concepts=[],
        suggestions=[],
    )

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        with patch(
            "app.api.v1.endpoints.interviews.evaluate_candidate_answer",
            new=AsyncMock(return_value=(mock_eval_output, 8.85)),
        ):
            res = client.post(
                "/api/v1/interviews/mock-eval-alias/evaluate",
                json={"answer_id": "ans-eval-alias"},
            )
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "evaluated"
            assert data["answer_id"] == "ans-eval-alias"
            assert data["overall_score"] == 8.85
    finally:
        app.dependency_overrides.clear()
