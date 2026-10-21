from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models.interview import InterviewSessionModel
from app.schemas.interview import (
    InterviewQuestionSchema,
    SeniorityLevel,
    SessionStartResponse,
    SessionStatus,
)


client = TestClient(app)


@pytest.fixture(autouse=True)
def ensure_offline_mode(monkeypatch):
    """Ensure lifecycle tests execute offline deterministically without network quota exhaustion."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)


def test_session_status_enum_values():
    """Verify state machine status values."""
    assert SessionStatus.CONFIGURED.value == "configured"
    assert SessionStatus.IN_PROGRESS.value == "in_progress"
    assert SessionStatus.COMPLETED.value == "completed"


def test_interview_question_schema_validation():
    """Verify structured question schema constraints."""
    question = InterviewQuestionSchema(
        question_number=1,
        topic="Distributed Consensus & Raft",
        difficulty=SeniorityLevel.SENIOR,
        question_text="Design a leader election mechanism handling network partitions.",
        starter_code="class RaftNode:\n    def __init__(self, node_id: str):\n        pass",
        expected_concepts=["Split-brain", "Heartbeat timeout", "Term numbers"],
    )
    assert question.question_number == 1
    assert question.topic == "Distributed Consensus & Raft"
    assert question.difficulty == SeniorityLevel.SENIOR
    assert len(question.expected_concepts) == 3


def test_session_start_response_schema():
    """Verify session start response schema structure."""
    question = InterviewQuestionSchema(
        question_number=1,
        topic="Database Indexing",
        difficulty=SeniorityLevel.MID,
        question_text="Explain B-Tree vs LSM-Tree read/write trade-offs.",
        expected_concepts=["B-Tree", "LSM-Tree", "Compaction"],
    )
    response = SessionStartResponse(
        status=SessionStatus.IN_PROGRESS,
        session_id="mock-1234567890ab",
        current_question=question,
    )
    assert response.status == SessionStatus.IN_PROGRESS
    assert response.session_id == "mock-1234567890ab"
    assert response.current_question.topic == "Database Indexing"


def test_configure_interview_persists_session():
    """Verify that configure_interview persists the model into the database session."""
    mock_session = AsyncMock(spec=AsyncSession)
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.rollback = AsyncMock()
    mock_session.refresh = AsyncMock()

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        payload = {
            "role": "Distributed Systems Architect",
            "difficulty": "Staff",
            "primaryLanguage": "Python",
            "questionCount": 7,
        }
        res = client.post("/api/v1/interviews/config", json=payload)
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "configured"
        assert data["session_id"].startswith("mock-")
        assert data["config"]["role"] == "Distributed Systems Architect"
        assert data["config"]["difficulty"] == "Staff"
        assert data["config"]["questionCount"] == 7

        # Verify database interaction
        mock_session.add.assert_called_once()
        saved_record = mock_session.add.call_args[0][0]
        assert isinstance(saved_record, InterviewSessionModel)
        assert saved_record.id == data["session_id"]
        assert saved_record.role == "Distributed Systems Architect"
        assert saved_record.difficulty == "Staff"
        assert saved_record.primary_language == "Python"
        assert saved_record.question_count == 7
        assert saved_record.status == "configured"

        # Verify transaction commit
        mock_session.commit.assert_awaited_once()
        mock_session.refresh.assert_awaited_once_with(saved_record)
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_get_persisted_session_success():
    """Verify retrieving a persisted session by ID."""
    test_session = InterviewSessionModel(
        id="mock-test-session-123",
        role="Backend Core Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="configured",
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = test_session
    mock_session.execute = AsyncMock(return_value=mock_result)

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.get("/api/v1/interviews/mock-test-session-123")
        assert res.status_code == 200
        data = res.json()
        assert data["session_id"] == "mock-test-session-123"
        assert data["status"] == "configured"
        assert data["config"]["role"] == "Backend Core Engineer"
        assert data["config"]["difficulty"] == "Senior"
        assert data["config"]["primaryLanguage"] == "Python"
        assert data["config"]["questionCount"] == 5
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_get_session_not_found():
    """Verify 404 response for nonexistent session IDs."""
    empty_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    empty_session.execute = AsyncMock(return_value=mock_result)

    async def override_empty_db():
        yield empty_session

    app.dependency_overrides[get_db] = override_empty_db
    try:
        res = client.get("/api/v1/interviews/mock-nonexistent-999")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_database_rollback_on_transaction_failure():
    """Verify that database errors trigger rollback and return safe HTTP 500."""
    failing_session = AsyncMock(spec=AsyncSession)
    failing_session.add = MagicMock()
    failing_session.commit = AsyncMock(side_effect=RuntimeError("Simulated connection drop"))
    failing_session.rollback = AsyncMock()

    async def override_failing_db():
        yield failing_session

    app.dependency_overrides[get_db] = override_failing_db
    try:
        payload = {
            "role": "Systems Engineer",
            "difficulty": "Senior",
            "primaryLanguage": "Python",
            "questionCount": 5,
        }
        res = client.post("/api/v1/interviews/config", json=payload)
        assert res.status_code == 500
        assert "Database transaction failed: RuntimeError" in res.json()["detail"]
        # Verify rollback was called to ensure transactional safety
        failing_session.rollback.assert_awaited_once()
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_start_interview_session_success():
    """Verify successfully starting a configured interview session."""
    test_session = InterviewSessionModel(
        id="mock-start-test-111",
        role="Distributed Systems Architect",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="configured",
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = test_session
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-start-test-111/start")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "in_progress"
        assert data["session_id"] == "mock-start-test-111"
        assert "current_question" in data
        assert data["current_question"]["question_number"] == 1
        assert "topic" in data["current_question"]
        assert len(data["current_question"]["expected_concepts"]) >= 1

        # Verify session state was transitioned and committed
        assert test_session.status == "in_progress"
        mock_session.commit.assert_awaited_once()
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_start_interview_session_not_found_404():
    """Verify 404 response when trying to start a nonexistent session."""
    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(return_value=mock_result)

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-missing-999/start")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_start_interview_session_conflict_already_in_progress_409():
    """Verify 409 Conflict when attempting to start an already running session."""
    running_session = InterviewSessionModel(
        id="mock-running-222",
        role="Backend Engineer",
        difficulty="Mid",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = running_session
    mock_session.execute = AsyncMock(return_value=mock_result)

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-running-222/start")
        assert res.status_code == 409
        assert "Cannot start interview session" in res.json()["detail"]
        assert "in_progress" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_start_interview_session_conflict_already_completed_409():
    """Verify 409 Conflict when attempting to start a completed session."""
    completed_session = InterviewSessionModel(
        id="mock-done-333",
        role="Data Engineer",
        difficulty="Senior",
        primary_language="SQL",
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
        res = client.post("/api/v1/interviews/mock-done-333/start")
        assert res.status_code == 409
        assert "completed" in res.json()["detail"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_start_interview_session_generation_failure_rolls_back(monkeypatch):
    """Verify that question generation failure triggers rollback and does not leave session in_progress."""
    configured_session = InterviewSessionModel(
        id="mock-fail-444",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="configured",
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = configured_session
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.rollback = AsyncMock()

    async def override_db():
        yield mock_session

    from app.services.gemini_service import GeminiProviderError
    import app.api.v1.endpoints.interviews as interview_endpoint

    async def mock_failing_generator(*args, **kwargs):
        raise GeminiProviderError("Simulated Gemini API quota exhaustion")

    monkeypatch.setattr(interview_endpoint, "generate_interview_question", mock_failing_generator)

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-fail-444/start")
        assert res.status_code == 502
        assert "AI Question generation failed" in res.json()["detail"]

        # Crucial check: rollback was called and status remains configured
        mock_session.rollback.assert_awaited()
        assert configured_session.status == "configured"
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_start_interview_session_commit_failure_rolls_back():
    """Verify that database commit errors trigger rollback."""
    configured_session = InterviewSessionModel(
        id="mock-commit-fail-555",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="configured",
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = configured_session
    mock_session.execute = AsyncMock(return_value=mock_result)
    mock_session.commit = AsyncMock(side_effect=RuntimeError("Simulated connection dropped during commit"))
    mock_session.rollback = AsyncMock()

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-commit-fail-555/start")
        assert res.status_code == 500
        assert "Failed to persist session start state" in res.json()["detail"]
        mock_session.rollback.assert_awaited()
    finally:
        app.dependency_overrides.pop(get_db, None)
