from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models.interview import (
    CandidateAnswerModel,
    FollowUpQuestionModel,
    InterviewSessionModel,
)
from app.schemas.interview import FollowUpQuestionOutput
from app.services.gemini_service import (
    GeminiProviderError,
    GeminiValidationError,
)

client = TestClient(app)


def test_generate_follow_up_1_success():
    """Verify successfully generating and persisting adaptive follow-up #1."""
    active_session = InterviewSessionModel(
        id="mock-fu-test-1",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    primary_answer = CandidateAnswerModel(
        id="ans-fu-test-1",
        session_id="mock-fu-test-1",
        question_number=1,
        answer_text="I will use a sliding window with a dictionary.",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    # 1. session query, 2. answer query, 3. eval query, 4. existing follow-ups query
    s_res = MagicMock()
    s_res.scalar_one_or_none.return_value = active_session

    ans_res = MagicMock()
    ans_res.scalars.return_value.first.return_value = primary_answer

    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = None

    fu_res = MagicMock()
    fu_res.scalars.return_value.all.return_value = []  # No existing follow-ups

    mock_session.execute = AsyncMock(side_effect=[s_res, ans_res, eval_res, fu_res])
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()

    mock_output = FollowUpQuestionOutput(
        question_text="How would you adapt your sliding window approach if the stream of characters is distributed across 10 Kafka partitions?",
        expected_concepts=["Kafka Partitioning", "Stateful Aggregation", "Windowing"],
        probing_reason="Investigate distributed scale and partition-aware windowing.",
    )

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        with patch(
            "app.api.v1.endpoints.interviews.generate_follow_up_question",
            new=AsyncMock(return_value=mock_output),
        ):
            res = client.post("/api/v1/interviews/mock-fu-test-1/questions/1/follow-up")
            assert res.status_code == 200
            data = res.json()
            assert data["status"] == "generated"
            assert data["id"].startswith("fq-")
            assert data["session_id"] == "mock-fu-test-1"
            assert data["primary_question_number"] == 1
            assert data["follow_up_number"] == 1
            assert "Kafka partitions" in data["question_text"]
            assert data["candidate_answer"] is None

            # Verify persisted database record
            mock_session.add.assert_called_once()
            saved_fu = mock_session.add.call_args[0][0]
            assert isinstance(saved_fu, FollowUpQuestionModel)
            assert saved_fu.follow_up_number == 1
            assert saved_fu.primary_question_number == 1
            mock_session.commit.assert_awaited_once()
    finally:
        app.dependency_overrides.clear()


def test_generate_follow_up_2_success():
    """Verify successfully generating follow-up #2 when follow-up #1 has been answered."""
    active_session = InterviewSessionModel(
        id="mock-fu-test-2",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    primary_answer = CandidateAnswerModel(
        id="ans-fu-test-2",
        session_id="mock-fu-test-2",
        question_number=1,
        answer_text="Primary sliding window solution.",
        submitted_at=datetime.now(timezone.utc),
    )
    answered_fu_1 = FollowUpQuestionModel(
        id="fq-111",
        session_id="mock-fu-test-2",
        primary_question_number=1,
        follow_up_number=1,
        question_text="How to handle distributed partitions?",
        expected_concepts=["Kafka"],
        candidate_answer="We can route by key to preserve order per partition.",
        created_at=datetime.now(timezone.utc),
        answered_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    s_res = MagicMock()
    s_res.scalar_one_or_none.return_value = active_session

    ans_res = MagicMock()
    ans_res.scalars.return_value.first.return_value = primary_answer

    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = None

    fu_res = MagicMock()
    fu_res.scalars.return_value.all.return_value = [answered_fu_1]

    mock_session.execute = AsyncMock(side_effect=[s_res, ans_res, eval_res, fu_res])
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()

    mock_output = FollowUpQuestionOutput(
        question_text="What happens when a partition consumer rebalances during an active window calculation?",
        expected_concepts=["Consumer Rebalance", "Offset Management", "Idempotency"],
        probing_reason="Probe fault tolerance and partition rebalance semantics.",
    )

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        with patch(
            "app.api.v1.endpoints.interviews.generate_follow_up_question",
            new=AsyncMock(return_value=mock_output),
        ):
            res = client.post("/api/v1/interviews/mock-fu-test-2/questions/1/follow-up")
            assert res.status_code == 200
            data = res.json()
            assert data["follow_up_number"] == 2
            assert "consumer rebalances" in data["question_text"]
    finally:
        app.dependency_overrides.clear()


def test_generate_follow_up_exceeds_max_limit_409():
    """Verify 409 Conflict when attempting to generate more than 2 follow-ups."""
    active_session = InterviewSessionModel(
        id="mock-fu-limit",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    primary_answer = CandidateAnswerModel(
        id="ans-fu-limit",
        session_id="mock-fu-limit",
        question_number=1,
        answer_text="Primary solution.",
        submitted_at=datetime.now(timezone.utc),
    )
    fu_1 = FollowUpQuestionModel(
        id="fq-1",
        session_id="mock-fu-limit",
        primary_question_number=1,
        follow_up_number=1,
        question_text="Q1",
        expected_concepts=[],
        candidate_answer="A1",
    )
    fu_2 = FollowUpQuestionModel(
        id="fq-2",
        session_id="mock-fu-limit",
        primary_question_number=1,
        follow_up_number=2,
        question_text="Q2",
        expected_concepts=[],
        candidate_answer="A2",
    )

    mock_session = AsyncMock(spec=AsyncSession)
    s_res = MagicMock()
    s_res.scalar_one_or_none.return_value = active_session

    ans_res = MagicMock()
    ans_res.scalars.return_value.first.return_value = primary_answer

    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = None

    fu_res = MagicMock()
    fu_res.scalars.return_value.all.return_value = [fu_1, fu_2]

    mock_session.execute = AsyncMock(side_effect=[s_res, ans_res, eval_res, fu_res])

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-fu-limit/questions/1/follow-up")
        assert res.status_code == 409
        assert "Maximum limit of 2 follow-up questions reached" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_generate_follow_up_2_blocked_if_fu_1_unanswered_409():
    """Verify 409 Conflict when requesting follow-up #2 before answering follow-up #1."""
    active_session = InterviewSessionModel(
        id="mock-fu-unanswered",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    primary_answer = CandidateAnswerModel(
        id="ans-fu-unanswered",
        session_id="mock-fu-unanswered",
        question_number=1,
        answer_text="Primary solution.",
        submitted_at=datetime.now(timezone.utc),
    )
    unanswered_fu_1 = FollowUpQuestionModel(
        id="fq-unanswered",
        session_id="mock-fu-unanswered",
        primary_question_number=1,
        follow_up_number=1,
        question_text="Q1",
        expected_concepts=[],
        candidate_answer=None,  # Not yet answered!
    )

    mock_session = AsyncMock(spec=AsyncSession)
    s_res = MagicMock()
    s_res.scalar_one_or_none.return_value = active_session

    ans_res = MagicMock()
    ans_res.scalars.return_value.first.return_value = primary_answer

    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = None

    fu_res = MagicMock()
    fu_res.scalars.return_value.all.return_value = [unanswered_fu_1]

    mock_session.execute = AsyncMock(side_effect=[s_res, ans_res, eval_res, fu_res])

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-fu-unanswered/questions/1/follow-up")
        assert res.status_code == 409
        assert "Please submit an answer for follow-up question #1" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_generate_follow_up_session_not_in_progress_409():
    """Verify 409 Conflict when session is in configured or completed status."""
    configured_session = InterviewSessionModel(
        id="mock-fu-configured",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="configured",
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    s_res = MagicMock()
    s_res.scalar_one_or_none.return_value = configured_session
    mock_session.execute = AsyncMock(return_value=s_res)

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-fu-configured/questions/1/follow-up")
        assert res.status_code == 409
        assert "Only sessions in 'in_progress' state accept follow-ups" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_generate_follow_up_missing_session_404():
    """Verify 404 Not Found when session does not exist."""
    mock_session = AsyncMock(spec=AsyncSession)
    s_res = MagicMock()
    s_res.scalar_one_or_none.return_value = None
    mock_session.execute = AsyncMock(return_value=s_res)

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-missing/questions/1/follow-up")
        assert res.status_code == 404
        assert "Interview session 'mock-missing' not found." in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_generate_follow_up_missing_primary_answer_404():
    """Verify 404 Not Found when no answer was submitted yet for the primary question."""
    active_session = InterviewSessionModel(
        id="mock-fu-no-ans",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    s_res = MagicMock()
    s_res.scalar_one_or_none.return_value = active_session

    ans_res = MagicMock()
    ans_res.scalars.return_value.first.return_value = None  # No answer

    mock_session.execute = AsyncMock(side_effect=[s_res, ans_res])

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-fu-no-ans/questions/1/follow-up")
        assert res.status_code == 404
        assert "No candidate answer submitted yet for question 1" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_generate_follow_up_gemini_unconfigured_503():
    """Verify 503 Service Unavailable when GEMINI_API_KEY is not configured."""
    active_session = InterviewSessionModel(
        id="mock-fu-unconf",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    primary_answer = CandidateAnswerModel(
        id="ans-fu-unconf",
        session_id="mock-fu-unconf",
        question_number=1,
        answer_text="Primary answer",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    s_res = MagicMock()
    s_res.scalar_one_or_none.return_value = active_session
    ans_res = MagicMock()
    ans_res.scalars.return_value.first.return_value = primary_answer
    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = None
    fu_res = MagicMock()
    fu_res.scalars.return_value.all.return_value = []
    mock_session.execute = AsyncMock(side_effect=[s_res, ans_res, eval_res, fu_res])

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        with patch.object(settings, "GEMINI_API_KEY", ""):
            res = client.post("/api/v1/interviews/mock-fu-unconf/questions/1/follow-up")
            assert res.status_code == 503
            assert "Gemini API key is not configured" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_generate_follow_up_malformed_gemini_output_502():
    """Verify 502 Bad Gateway when Gemini output fails schema validation."""
    active_session = InterviewSessionModel(
        id="mock-fu-malformed",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    primary_answer = CandidateAnswerModel(
        id="ans-fu-malformed",
        session_id="mock-fu-malformed",
        question_number=1,
        answer_text="Primary answer",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    s_res = MagicMock()
    s_res.scalar_one_or_none.return_value = active_session
    ans_res = MagicMock()
    ans_res.scalars.return_value.first.return_value = primary_answer
    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = None
    fu_res = MagicMock()
    fu_res.scalars.return_value.all.return_value = []
    mock_session.execute = AsyncMock(side_effect=[s_res, ans_res, eval_res, fu_res])

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        with patch(
            "app.api.v1.endpoints.interviews.generate_follow_up_question",
            side_effect=GeminiValidationError("Invalid schema: missing probing_reason"),
        ):
            res = client.post("/api/v1/interviews/mock-fu-malformed/questions/1/follow-up")
            assert res.status_code == 502
            assert "AI follow-up output validation failed" in res.json()["detail"]
    finally:
        app.dependency_overrides.clear()


def test_generate_follow_up_db_rollback_on_failure_500():
    """Verify database rollback when committing follow-up record fails."""
    active_session = InterviewSessionModel(
        id="mock-fu-dberr",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    primary_answer = CandidateAnswerModel(
        id="ans-fu-dberr",
        session_id="mock-fu-dberr",
        question_number=1,
        answer_text="Primary answer",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    s_res = MagicMock()
    s_res.scalar_one_or_none.return_value = active_session
    ans_res = MagicMock()
    ans_res.scalars.return_value.first.return_value = primary_answer
    eval_res = MagicMock()
    eval_res.scalar_one_or_none.return_value = None
    fu_res = MagicMock()
    fu_res.scalars.return_value.all.return_value = []
    mock_session.execute = AsyncMock(side_effect=[s_res, ans_res, eval_res, fu_res])
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock(side_effect=Exception("Disk full"))
    mock_session.rollback = AsyncMock()

    mock_output = FollowUpQuestionOutput(
        question_text="How to scale windowing?",
        expected_concepts=["Scaling"],
        probing_reason="Test reason",
    )

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        with patch(
            "app.api.v1.endpoints.interviews.generate_follow_up_question",
            new=AsyncMock(return_value=mock_output),
        ):
            res = client.post("/api/v1/interviews/mock-fu-dberr/questions/1/follow-up")
            assert res.status_code == 500
            assert "Database transaction failed while saving follow-up question" in res.json()["detail"]
            mock_session.rollback.assert_awaited_once()
    finally:
        app.dependency_overrides.clear()


def test_submit_follow_up_answer_success():
    """Verify candidate answering an existing follow-up question."""
    active_session = InterviewSessionModel(
        id="mock-ans-fu",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    follow_up_record = FollowUpQuestionModel(
        id="fq-ans-101",
        session_id="mock-ans-fu",
        primary_question_number=1,
        follow_up_number=1,
        question_text="How to handle partition rebalancing?",
        expected_concepts=["Offsets"],
        candidate_answer=None,
    )

    mock_session = AsyncMock(spec=AsyncSession)
    s_res = MagicMock()
    s_res.scalar_one_or_none.return_value = active_session
    fu_res = MagicMock()
    fu_res.scalar_one_or_none.return_value = follow_up_record
    mock_session.execute = AsyncMock(side_effect=[s_res, fu_res])
    mock_session.commit = AsyncMock()
    mock_session.refresh = AsyncMock()

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post(
            "/api/v1/interviews/mock-ans-fu/follow-ups/fq-ans-101/answer",
            json={"answer_text": "We can commit offsets synchronously before revocation using a ConsumerRebalanceListener."},
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "answered"
        assert data["id"] == "fq-ans-101"
        assert "ConsumerRebalanceListener" in data["candidate_answer"]
        assert "answered_at" in data
        mock_session.commit.assert_awaited_once()
    finally:
        app.dependency_overrides.clear()


def test_submit_follow_up_answer_empty_whitespace_rejected_422():
    """Verify 422 Unprocessable Entity when follow-up answer is whitespace only."""
    res = client.post(
        "/api/v1/interviews/mock-any/follow-ups/fq-any/answer",
        json={"answer_text": "   "},
    )
    assert res.status_code == 422
    assert "Follow-up answer cannot be empty or whitespace only" in res.text


def test_list_follow_up_questions_ordered():
    """Verify retrieving existing follow-ups for a question in sequence order."""
    fu_1 = FollowUpQuestionModel(
        id="fq-list-1",
        session_id="mock-list",
        primary_question_number=1,
        follow_up_number=1,
        question_text="Follow up 1",
        expected_concepts=["A"],
        candidate_answer="Answer 1",
        created_at=datetime.now(timezone.utc),
    )
    fu_2 = FollowUpQuestionModel(
        id="fq-list-2",
        session_id="mock-list",
        primary_question_number=1,
        follow_up_number=2,
        question_text="Follow up 2",
        expected_concepts=["B"],
        candidate_answer=None,
        created_at=datetime.now(timezone.utc),
    )

    mock_session = AsyncMock(spec=AsyncSession)
    fu_res = MagicMock()
    fu_res.scalars.return_value.all.return_value = [fu_1, fu_2]
    mock_session.execute = AsyncMock(return_value=fu_res)

    async def override_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.get("/api/v1/interviews/mock-list/questions/1/follow-ups")
        assert res.status_code == 200
        data = res.json()
        assert len(data) == 2
        assert data[0]["follow_up_number"] == 1
        assert data[1]["follow_up_number"] == 2
    finally:
        app.dependency_overrides.clear()
