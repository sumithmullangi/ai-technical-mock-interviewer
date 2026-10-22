from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.main import app
from app.models.interview import CandidateAnswerModel, InterviewSessionModel


client = TestClient(app)


def test_submit_answer_success():
    """Verify successfully submitting and persisting a candidate answer."""
    active_session = InterviewSessionModel(
        id="mock-ans-test-101",
        role="Backend Engineer (Distributed Systems)",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = active_session
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        payload = {
            "question_number": 1,
            "answer_text": "We can use Redis with Redlock for distributed locking, plus a PostgreSQL unique constraint on idempotency_key.",
        }
        res = client.post("/api/v1/interviews/mock-ans-test-101/answer", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "submitted"
        assert data["answer_id"].startswith("ans-")
        assert data["session_id"] == "mock-ans-test-101"
        assert data["question_number"] == 1
        assert "submitted_at" in data

        # Verify database interaction
        mock_session.add.assert_called_once()
        saved_answer = mock_session.add.call_args[0][0]
        assert isinstance(saved_answer, CandidateAnswerModel)
        assert saved_answer.session_id == "mock-ans-test-101"
        assert saved_answer.question_number == 1
        assert "Redis with Redlock" in saved_answer.answer_text
        mock_session.commit.assert_awaited_once()
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_submit_answer_empty_whitespace_rejected_422():
    """Verify empty or whitespace-only answers are rejected with HTTP 422."""
    # Pure empty string
    res_empty = client.post(
        "/api/v1/interviews/mock-any-123/answer",
        json={"question_number": 1, "answer_text": ""},
    )
    assert res_empty.status_code == 422

    # Whitespace only
    res_ws = client.post(
        "/api/v1/interviews/mock-any-123/answer",
        json={"question_number": 1, "answer_text": "   \n\t   "},
    )
    assert res_ws.status_code == 422


def test_submit_answer_missing_session_404():
    """Verify 404 response when session does not exist."""
    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(return_value=mock_result)

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        payload = {"question_number": 1, "answer_text": "My solution here."}
        res = client.post("/api/v1/interviews/mock-nonexistent-999/answer", json=payload)
        assert res.status_code == 404
        assert "not found" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_submit_answer_invalid_status_configured_409():
    """Verify 409 Conflict when attempting to submit an answer before session is started."""
    configured_session = InterviewSessionModel(
        id="mock-conf-202",
        role="Backend Engineer",
        difficulty="Mid",
        primary_language="Python",
        question_count=5,
        status="configured",
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = configured_session
    mock_session.execute = AsyncMock(return_value=mock_result)

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        payload = {"question_number": 1, "answer_text": "My answer before start."}
        res = client.post("/api/v1/interviews/mock-conf-202/answer", json=payload)
        assert res.status_code == 409
        assert "configured" in res.json()["detail"]
        assert "Only sessions in 'in_progress' state accept answers" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_submit_answer_invalid_status_completed_409():
    """Verify 409 Conflict when attempting to submit an answer to a completed session."""
    completed_session = InterviewSessionModel(
        id="mock-comp-303",
        role="Backend Engineer",
        difficulty="Mid",
        primary_language="Python",
        question_count=5,
        status="completed",
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = completed_session
    mock_session.execute = AsyncMock(return_value=mock_result)

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        payload = {"question_number": 1, "answer_text": "My post-completion answer."}
        res = client.post("/api/v1/interviews/mock-comp-303/answer", json=payload)
        assert res.status_code == 409
        assert "completed" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_submit_answer_question_number_out_of_bounds_422():
    """Verify 422 response if question number exceeds configured session question count."""
    active_session = InterviewSessionModel(
        id="mock-bounds-404",
        role="Backend Engineer",
        difficulty="Mid",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = active_session
    mock_session.execute = AsyncMock(return_value=mock_result)

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        payload = {"question_number": 99, "answer_text": "My answer for question 99."}
        res = client.post("/api/v1/interviews/mock-bounds-404/answer", json=payload)
        assert res.status_code == 422
        assert "out of bounds" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_submit_answer_database_rollback_on_failure():
    """Verify transactional rollback when database commit fails during answer persistence."""
    active_session = InterviewSessionModel(
        id="mock-fail-505",
        role="Backend Engineer",
        difficulty="Mid",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = active_session
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock(side_effect=RuntimeError("Disk full or connection broken"))
    mock_session.rollback = AsyncMock()

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        payload = {"question_number": 1, "answer_text": "Valid code solution."}
        res = client.post("/api/v1/interviews/mock-fail-505/answer", json=payload)
        assert res.status_code == 500
        assert "Database transaction failed while saving answer" in res.json()["detail"]
        mock_session.rollback.assert_awaited_once()
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_submit_answer_with_aliases():
    """Verify alias support: answerText / response and questionNumber."""
    active_session = InterviewSessionModel(
        id="mock-alias-606",
        role="Backend Engineer",
        difficulty="Mid",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = active_session
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        payload = {
            "questionNumber": 1,
            "answerText": "Solution using alias fields.",
        }
        res = client.post("/api/v1/interviews/mock-alias-606/answer", json=payload)
        assert res.status_code == 200
        assert res.json()["status"] == "submitted"
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_submit_answer_plural_route_alias():
    """Regression test: Verify POST /api/v1/interviews/{session_id}/answers succeeds (plural alias).
    
    Prevents 404 Not Found error when the frontend ActiveInterviewView submits candidate answers.
    """
    active_session = InterviewSessionModel(
        id="mock-plural-ans-101",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = active_session
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        payload = {
            "question_number": 1,
            "answer_text": "Plural endpoint submission verification.",
        }
        res = client.post("/api/v1/interviews/mock-plural-ans-101/answers", json=payload)
        assert res.status_code == 200, f"Expected 200 OK on /answers, got {res.status_code} ({res.text})"
        data = res.json()
        assert data["status"] == "submitted"
        assert data["session_id"] == "mock-plural-ans-101"
        assert data["question_number"] == 1
    finally:
        app.dependency_overrides.pop(get_db, None)

