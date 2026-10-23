"""Tests for primary question progression and interview lifecycle completion.

Verifies:
- Normal question progression (Q1 -> Q2)
- Rejection when current primary question has no submitted answer (409)
- Rejection when requested follow-up is unanswered (409)
- Advancement permitted when primary answer submitted and 0 follow-ups requested
- Advancement permitted after all requested follow-ups are answered
- Session transition to completed upon finishing final primary question
- Preservation of completed sessions as read-only (409)
- 404 for missing session
- 409 for invalid session status
- 503 for unconfigured Gemini API key
- 502 for Gemini provider error with safe state preservation
- 500 on database commit failure with transaction rollback
- Ordered primary question retrieval via GET /{session_id}/questions
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models.interview import (
    CandidateAnswerModel,
    FollowUpQuestionModel,
    InterviewSessionModel,
    PrimaryQuestionModel,
)
from app.schemas.interview import (
    CodingLanguage,
    InterviewQuestionSchema,
    SeniorityLevel,
    SessionStatus,
)
from app.services.gemini_service import (
    GeminiProviderError,
    GeminiQuotaExceededError,
)

client = TestClient(app)


def _build_test_session(
    session_id="mock-prog-100",
    status="in_progress",
    question_count=3,
):
    return InterviewSessionModel(
        id=session_id,
        role="Distributed Systems Architect",
        difficulty="Senior",
        primary_language="Python",
        question_count=question_count,
        status=status,
        created_at=datetime.now(timezone.utc),
    )


def _build_primary_question(
    session_id="mock-prog-100",
    question_number=1,
    topic="Distributed Concurrency & Idempotency",
):
    return PrimaryQuestionModel(
        id=f"pq-test-{question_number}",
        session_id=session_id,
        question_number=question_number,
        topic=topic,
        difficulty="Senior",
        question_text=f"Question #{question_number} text on {topic}.",
        starter_code="class Handler:\n    pass",
        expected_concepts=["Fencing Tokens", "Idempotency"],
        created_at=datetime.now(timezone.utc),
    )


def _build_primary_answer(
    session_id="mock-prog-100",
    question_number=1,
    answer_text="Here is my technical solution with distributed locks.",
):
    return CandidateAnswerModel(
        id=f"ans-test-{question_number}",
        session_id=session_id,
        question_number=question_number,
        answer_text=answer_text,
        submitted_at=datetime.now(timezone.utc),
    )


def test_advance_to_question_2_success(monkeypatch):
    """Verify normal advancement from Question 1 to Question 2."""
    session = _build_test_session()
    pq1 = _build_primary_question(question_number=1)
    ans1 = _build_primary_answer(question_number=1)

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    # execute mocks:
    # 1: session lookup (FOR UPDATE)
    # 2: existing primary questions
    # 3: primary answer lookup
    # 4: follow-up lookup
    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = [pq1]

    res_ans = MagicMock()
    res_ans.scalars.return_value.first.return_value = ans1

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [res_session, res_pqs, res_ans, res_fus]

    # Mock generator for Q2
    mock_q2 = InterviewQuestionSchema(
        question_number=2,
        topic="High-Throughput Stream Processing & Backpressure",
        difficulty=SeniorityLevel.SENIOR,
        question_text="Design a streaming event ingestion service handling 50k events/sec.",
        starter_code="class StreamConsumer:\n    pass",
        expected_concepts=["Backpressure", "Kafka Partitions"],
    )

    import app.api.v1.endpoints.interviews as interview_endpoint
    monkeypatch.setattr(
        interview_endpoint,
        "generate_interview_question",
        AsyncMock(return_value=mock_q2),
    )

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/next")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "in_progress"
        assert data["session_id"] == "mock-prog-100"
        assert data["question_number"] == 2
        assert data["total_questions"] == 3
        assert data["is_completed"] is False
        assert data["current_question"]["topic"] == "High-Throughput Stream Processing & Backpressure"
        mock_db.commit.assert_awaited_once()
        mock_db.add.assert_called_once()
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_advance_blocked_if_current_question_unanswered_409():
    """Verify that advancing is blocked with 409 if candidate has not answered current question."""
    session = _build_test_session()
    pq1 = _build_primary_question(question_number=1)

    mock_db = AsyncMock(spec=AsyncSession)
    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = [pq1]

    res_ans = MagicMock()
    res_ans.scalars.return_value.first.return_value = None  # No answer submitted yet!

    mock_db.execute.side_effect = [res_session, res_pqs, res_ans]

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/next")
        assert res.status_code == 409
        assert "has not been answered yet" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_advance_blocked_if_requested_follow_up_unanswered_409():
    """Verify advancement is blocked if a requested follow-up has not been answered."""
    session = _build_test_session()
    pq1 = _build_primary_question(question_number=1)
    ans1 = _build_primary_answer(question_number=1)

    # Requested follow-up with candidate_answer=None
    unanswered_fu = FollowUpQuestionModel(
        id="fq-unanswered-1",
        session_id="mock-prog-100",
        primary_question_number=1,
        follow_up_number=1,
        question_text="How do you handle clock drift across nodes?",
        expected_concepts=["NTP drift", "TrueTime"],
        probing_reason="Edge cases",
        candidate_answer=None,  # Unanswered!
        created_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock(spec=AsyncSession)
    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = [pq1]

    res_ans = MagicMock()
    res_ans.scalars.return_value.first.return_value = ans1

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = [unanswered_fu]

    mock_db.execute.side_effect = [res_session, res_pqs, res_ans, res_fus]

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/next")
        assert res.status_code == 409
        assert "Follow-up question #1" in res.json()["detail"]
        assert "is still unanswered" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_advance_allowed_if_no_follow_ups_requested(monkeypatch):
    """Verify that candidates are NOT forced to request follow-ups; they can advance directly once primary answer is submitted."""
    session = _build_test_session()
    pq1 = _build_primary_question(question_number=1)
    ans1 = _build_primary_answer(question_number=1)

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = [pq1]

    res_ans = MagicMock()
    res_ans.scalars.return_value.first.return_value = ans1

    # 0 follow-ups were ever requested
    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [res_session, res_pqs, res_ans, res_fus]

    mock_q2 = InterviewQuestionSchema(
        question_number=2,
        topic="Stream Processing",
        difficulty=SeniorityLevel.SENIOR,
        question_text="Kafka stream ingestion challenge.",
        starter_code=None,
        expected_concepts=["Backpressure"],
    )

    import app.api.v1.endpoints.interviews as interview_endpoint
    monkeypatch.setattr(
        interview_endpoint,
        "generate_interview_question",
        AsyncMock(return_value=mock_q2),
    )

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/next")
        assert res.status_code == 200
        assert res.json()["question_number"] == 2
        assert res.json()["is_completed"] is False
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_advance_allowed_after_all_follow_ups_answered(monkeypatch):
    """Verify advancement succeeds when requested follow-ups have all been answered."""
    session = _build_test_session()
    pq1 = _build_primary_question(question_number=1)
    ans1 = _build_primary_answer(question_number=1)

    answered_fu = FollowUpQuestionModel(
        id="fq-answered-1",
        session_id="mock-prog-100",
        primary_question_number=1,
        follow_up_number=1,
        question_text="How do you handle clock drift?",
        expected_concepts=["NTP"],
        candidate_answer="We use NTP synchronization with bounded uncertainty.",
        created_at=datetime.now(timezone.utc),
        answered_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = [pq1]

    res_ans = MagicMock()
    res_ans.scalars.return_value.first.return_value = ans1

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = [answered_fu]

    mock_db.execute.side_effect = [res_session, res_pqs, res_ans, res_fus]

    mock_q2 = InterviewQuestionSchema(
        question_number=2,
        topic="Stream Processing",
        difficulty=SeniorityLevel.SENIOR,
        question_text="Kafka stream ingestion challenge.",
        starter_code=None,
        expected_concepts=["Backpressure"],
    )

    import app.api.v1.endpoints.interviews as interview_endpoint
    monkeypatch.setattr(
        interview_endpoint,
        "generate_interview_question",
        AsyncMock(return_value=mock_q2),
    )

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/next")
        assert res.status_code == 200
        assert res.json()["question_number"] == 2
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_advance_final_question_completes_session():
    """Verify that advancing after completing the final configured question marks the session COMPLETED."""
    # Session configured with 3 questions, currently on Question 3
    session = _build_test_session(question_count=3)
    pq1 = _build_primary_question(question_number=1)
    pq2 = _build_primary_question(question_number=2)
    pq3 = _build_primary_question(question_number=3)
    ans3 = _build_primary_answer(question_number=3)

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = [pq1, pq2, pq3]

    res_ans = MagicMock()
    res_ans.scalars.return_value.first.return_value = ans3

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [res_session, res_pqs, res_ans, res_fus]

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/next")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "completed"
        assert data["is_completed"] is True
        assert data["question_number"] == 3
        assert data["total_questions"] == 3
        assert data["current_question"] is None
        assert "completed successfully" in data["message"].lower()

        # Verify session model transitioned in DB
        assert session.status == "completed"
        mock_db.commit.assert_awaited_once()
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_advance_blocked_if_already_completed_409():
    """Verify that advancing an already completed session is rejected with 409 Conflict."""
    session = _build_test_session(status="completed")

    mock_db = AsyncMock(spec=AsyncSession)
    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session
    mock_db.execute.return_value = res_session

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/next")
        assert res.status_code == 409
        assert "already completed" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_advance_blocked_if_status_configured_409():
    """Verify that advancing a session that hasn't started yet is rejected with 409."""
    session = _build_test_session(status="configured")

    mock_db = AsyncMock(spec=AsyncSession)
    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session
    mock_db.execute.return_value = res_session

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/next")
        assert res.status_code == 409
        assert "configured" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_advance_missing_session_404():
    """Verify 404 response when advancing a nonexistent session."""
    mock_db = AsyncMock(spec=AsyncSession)
    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = res_session

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-missing-404/next")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_advance_gemini_unconfigured_503(monkeypatch):
    """Verify HTTP 503 is returned if Gemini API key is unconfigured during advance."""
    session = _build_test_session()
    pq1 = _build_primary_question(question_number=1)
    ans1 = _build_primary_answer(question_number=1)

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.rollback = AsyncMock()

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = [pq1]

    res_ans = MagicMock()
    res_ans.scalars.return_value.first.return_value = ans1

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [res_session, res_pqs, res_ans, res_fus]

    import app.api.v1.endpoints.interviews as interview_endpoint
    monkeypatch.setattr(
        interview_endpoint,
        "generate_interview_question",
        AsyncMock(side_effect=GeminiProviderError("Gemini API key is not configured.")),
    )

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/next")
        assert res.status_code == 503
        assert "Gemini API key is not configured" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_advance_gemini_provider_error_502(monkeypatch):
    """Verify HTTP 502 Bad Gateway when Gemini API provider fails."""
    session = _build_test_session()
    pq1 = _build_primary_question(question_number=1)
    ans1 = _build_primary_answer(question_number=1)

    mock_db = AsyncMock(spec=AsyncSession)
    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = [pq1]

    res_ans = MagicMock()
    res_ans.scalars.return_value.first.return_value = ans1

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [res_session, res_pqs, res_ans, res_fus]

    import app.api.v1.endpoints.interviews as interview_endpoint
    monkeypatch.setattr(
        interview_endpoint,
        "generate_interview_question",
        AsyncMock(side_effect=GeminiProviderError("Gemini API network timeout")),
    )

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/next")
        assert res.status_code == 502
        assert "provider error" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_advance_database_rollback_on_failure_500(monkeypatch):
    """Verify database errors trigger rollback and return HTTP 500."""
    session = _build_test_session()
    pq1 = _build_primary_question(question_number=1)
    ans1 = _build_primary_answer(question_number=1)

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock(side_effect=RuntimeError("Database lock failure"))
    mock_db.rollback = AsyncMock()

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = [pq1]

    res_ans = MagicMock()
    res_ans.scalars.return_value.first.return_value = ans1

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [res_session, res_pqs, res_ans, res_fus]

    mock_q2 = InterviewQuestionSchema(
        question_number=2,
        topic="Stream Processing",
        difficulty=SeniorityLevel.SENIOR,
        question_text="Kafka stream ingestion challenge.",
        starter_code=None,
        expected_concepts=["Backpressure"],
    )

    import app.api.v1.endpoints.interviews as interview_endpoint
    monkeypatch.setattr(
        interview_endpoint,
        "generate_interview_question",
        AsyncMock(return_value=mock_q2),
    )

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/next")
        assert res.status_code == 500
        assert "Database transaction failed" in res.json()["detail"]
        mock_db.rollback.assert_awaited_once()
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_list_primary_questions_ordered():
    """Verify GET /{session_id}/questions returns primary questions in ascending order."""
    session = _build_test_session()
    pq1 = _build_primary_question(question_number=1, topic="Concurrency")
    pq2 = _build_primary_question(question_number=2, topic="Caching")

    mock_db = AsyncMock(spec=AsyncSession)
    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = [pq1, pq2]

    mock_db.execute.side_effect = [res_session, res_pqs]

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.get("/api/v1/interviews/mock-prog-100/questions")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 2
        assert data[0]["question_number"] == 1
        assert data[0]["topic"] == "Concurrency"
        assert data[1]["question_number"] == 2
        assert data[1]["topic"] == "Caching"
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_advance_alias_endpoint(monkeypatch):
    """Verify POST /{session_id}/advance works identically as alias."""
    session = _build_test_session()
    pq1 = _build_primary_question(question_number=1)
    ans1 = _build_primary_answer(question_number=1)

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = [pq1]

    res_ans = MagicMock()
    res_ans.scalars.return_value.first.return_value = ans1

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [res_session, res_pqs, res_ans, res_fus]

    mock_q2 = InterviewQuestionSchema(
        question_number=2,
        topic="Stream Processing",
        difficulty=SeniorityLevel.SENIOR,
        question_text="Kafka stream ingestion challenge.",
        starter_code=None,
        expected_concepts=["Backpressure"],
    )

    import app.api.v1.endpoints.interviews as interview_endpoint
    monkeypatch.setattr(
        interview_endpoint,
        "generate_interview_question",
        AsyncMock(return_value=mock_q2),
    )

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/advance")
        assert res.status_code == 200
        assert res.json()["question_number"] == 2
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_advance_offline_progression_when_api_key_unset(monkeypatch):
    """Verify advancement succeeds with offline question catalog when GEMINI_API_KEY is empty/unset."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "")

    session = _build_test_session()
    pq1 = _build_primary_question(question_number=1)
    ans1 = _build_primary_answer(question_number=1)

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = [pq1]

    res_ans = MagicMock()
    res_ans.scalars.return_value.first.return_value = ans1

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [res_session, res_pqs, res_ans, res_fus]

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/next")
        assert res.status_code == 200
        data = res.json()
        assert data["question_number"] == 2
        assert "High-Throughput Stream Ingestion" in data["current_question"]["topic"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_advance_gemini_quota_exceeded_returns_429(monkeypatch):
    """Verify HTTP 429 and Retry-After header are returned when Gemini API quota is exhausted during question generation."""
    session = _build_test_session()
    pq1 = _build_primary_question(question_number=1)
    ans1 = _build_primary_answer(question_number=1)

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.rollback = AsyncMock()

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = [pq1]

    res_ans = MagicMock()
    res_ans.scalars.return_value.first.return_value = ans1

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [res_session, res_pqs, res_ans, res_fus]

    import app.api.v1.endpoints.interviews as interview_endpoint
    monkeypatch.setattr(
        interview_endpoint,
        "generate_interview_question",
        AsyncMock(side_effect=GeminiQuotaExceededError("Gemini rate limit exceeded", retry_after=25.0)),
    )

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/next")
        assert res.status_code == 429
        assert res.headers.get("retry-after") == "25"
        assert "Gemini rate limit exceeded" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_complete_interview_early_success():
    """Verify candidate can conclude an active session early."""
    session = _build_test_session(status="in_progress")
    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session
    mock_db.execute.return_value = res_session

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/complete")
        assert res.status_code == 200
        data = res.json()
        assert data["is_completed"] is True
        assert data["status"] == "completed"
        assert session.status == "completed"
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_complete_interview_early_already_completed_idempotent():
    """Verify completing an already-completed session returns 200 idempotently."""
    session = _build_test_session(status="completed")
    mock_db = AsyncMock(spec=AsyncSession)

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session
    mock_db.execute.return_value = res_session

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-prog-100/complete")
        assert res.status_code == 200
        data = res.json()
        assert data["is_completed"] is True
        assert data["status"] == "completed"
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_complete_interview_early_not_found_404():
    """Verify 404 for unknown session."""
    mock_db = AsyncMock(spec=AsyncSession)
    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = res_session

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/non-existent-session/complete")
        assert res.status_code == 404
    finally:
        app.dependency_overrides.pop(get_db, None)

