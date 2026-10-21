"""Tests for Milestone 5 Stage 5: Final Interview Report.

Verifies:
- Report retrieval and generation for completed session with accurate dimension score aggregation.
- Rejection of in-progress sessions (409 Conflict).
- Rejection of configured sessions (409 Conflict).
- 404 for missing sessions.
- Completed session without evaluations returns None scores (not 0.0) and "Not Evaluated".
- Idempotent repeated calls return identical report without duplicate DB records.
- Support for refresh=true query parameter.
- Deterministic fallback when Gemini is unconfigured or fails.
- Database commit failure raises 500 and triggers rollback.
- Exact mathematical accuracy of dimension score aggregation.
- Follow-up turns included in per-question breakdown.
- Support for camelCase aliases.
"""
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models.interview import (
    AnswerEvaluationModel,
    CandidateAnswerModel,
    FollowUpQuestionModel,
    InterviewReportModel,
    InterviewSessionModel,
    PrimaryQuestionModel,
)
from app.schemas.interview import (
    CodingLanguage,
    SeniorityLevel,
    SessionStatus,
    calculate_weighted_overall_score,
)

client = TestClient(app)


def _build_test_session(
    session_id="mock-report-100",
    status="completed",
    question_count=2,
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


def _build_primary_questions(session_id="mock-report-100"):
    q1 = PrimaryQuestionModel(
        id=f"pq-{session_id}-1",
        session_id=session_id,
        question_number=1,
        topic="Distributed Consensus & Raft",
        difficulty="Senior",
        question_text="Explain Raft leader election and log replication under network partition.",
        starter_code="class RaftNode:\n    pass",
        expected_concepts=["Leader Election", "Heartbeats", "Term Numbers"],
        created_at=datetime.now(timezone.utc),
    )
    q2 = PrimaryQuestionModel(
        id=f"pq-{session_id}-2",
        session_id=session_id,
        question_number=2,
        topic="Distributed Rate Limiter",
        difficulty="Senior",
        question_text="Design a multi-region token bucket rate limiter in Python.",
        starter_code="def rate_limiter():\n    pass",
        expected_concepts=["Token Bucket", "Redis Lua Scripting", "Clock Drift"],
        created_at=datetime.now(timezone.utc),
    )
    return [q1, q2]


def _build_answers(session_id="mock-report-100"):
    ans1 = CandidateAnswerModel(
        id=f"ans-{session_id}-1",
        session_id=session_id,
        question_number=1,
        answer_text="Raft uses randomized election timeouts and majority quorums for leader election.",
        submitted_at=datetime.now(timezone.utc),
    )
    ans2 = CandidateAnswerModel(
        id=f"ans-{session_id}-2",
        session_id=session_id,
        question_number=2,
        answer_text="We use Redis with atomic Lua scripts storing token count and timestamp.",
        submitted_at=datetime.now(timezone.utc),
    )
    return [ans1, ans2]


def _build_evaluations(session_id="mock-report-100"):
    # Q1: 8*0.4 + 9*0.25 + 7*0.2 + 8*0.15 = 3.2 + 2.25 + 1.4 + 1.2 = 8.05
    ev1 = AnswerEvaluationModel(
        id=f"eval-{session_id}-1",
        answer_id=f"ans-{session_id}-1",
        session_id=session_id,
        correctness_score=8.0,
        technical_depth_score=9.0,
        edge_cases_score=7.0,
        communication_score=8.0,
        overall_score=8.05,
        feedback="Strong explanation of Raft election safety.",
        strengths=["Raft term transitions", "Quorum calculations"],
        missing_concepts=["Split-brain joint consensus"],
        suggestions=["Review dynamic cluster membership changes."],
        created_at=datetime.now(timezone.utc),
    )
    # Q2: 9*0.4 + 8*0.25 + 8*0.2 + 9*0.15 = 3.6 + 2.0 + 1.6 + 1.35 = 8.55
    ev2 = AnswerEvaluationModel(
        id=f"eval-{session_id}-2",
        answer_id=f"ans-{session_id}-2",
        session_id=session_id,
        correctness_score=9.0,
        technical_depth_score=8.0,
        edge_cases_score=8.0,
        communication_score=9.0,
        overall_score=8.55,
        feedback="Excellent token bucket rate limiter design.",
        strengths=["Redis atomic execution", "Low latency synchronization"],
        missing_concepts=["Clock skew across multi-region datacenters"],
        suggestions=["Consider hybrid logical clocks for multi-region coordination."],
        created_at=datetime.now(timezone.utc),
    )
    return [ev1, ev2]


def _build_follow_ups(session_id="mock-report-100"):
    fu1 = FollowUpQuestionModel(
        id=f"fq-{session_id}-1-1",
        session_id=session_id,
        primary_question_number=1,
        follow_up_number=1,
        question_text="How do you handle log compaction with snapshotting?",
        expected_concepts=["Log Compaction", "Snapshotting"],
        probing_reason="Probe operational disk boundedness",
        candidate_answer="Snapshots write committed state to disk and truncate log entries.",
        answered_at=datetime.now(timezone.utc),
        created_at=datetime.now(timezone.utc),
    )
    return [fu1]


def test_get_report_success_completed_session():
    """Verify complete report generation with accurate dimension score aggregation."""
    session = _build_test_session()
    pqs = _build_primary_questions()
    ans = _build_answers()
    evals = _build_evaluations()
    fus = _build_follow_ups()

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_report = MagicMock()
    res_report.scalar_one_or_none.return_value = None  # No existing report yet

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = pqs

    res_ans = MagicMock()
    res_ans.scalars.return_value.all.return_value = ans

    res_evals = MagicMock()
    res_evals.scalars.return_value.all.return_value = evals

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = fus

    mock_db.execute.side_effect = [
        res_session,
        res_report,
        res_pqs,
        res_ans,
        res_evals,
        res_fus,
    ]

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    try:
        res = client.get("/api/v1/interviews/mock-report-100/report")
        assert res.status_code == 200
        data = res.json()

        assert data["status"] == "completed"
        assert data["session_id"] == "mock-report-100"
        assert data["total_questions"] == 2
        assert data["answered_questions"] == 2
        assert data["evaluated_questions"] == 2

        # Dimension averages:
        # Correctness: (8.0 + 9.0) / 2 = 8.5
        # Technical Depth: (9.0 + 8.0) / 2 = 8.5
        # Edge Cases: (7.0 + 8.0) / 2 = 7.5
        # Communication: (8.0 + 9.0) / 2 = 8.5
        # Weighted overall: 8.5*0.40 + 8.5*0.25 + 7.5*0.20 + 8.5*0.15 = 8.3
        scores = data["scores"]
        assert scores["correctness_average"] == 8.5
        assert scores["technical_depth_average"] == 8.5
        assert scores["edge_cases_average"] == 7.5
        assert scores["communication_average"] == 8.5
        assert scores["overall_score"] == 8.3
        assert data["overall_score"] == 8.3
        assert "Pass" in data["performance_rating"]

        # Strengths and missing concepts aggregated
        assert "Raft term transitions" in data["strengths"]
        assert "Redis atomic execution" in data["strengths"]
        assert "Split-brain joint consensus" in data["improvement_areas"]
        assert len(data["study_recommendations"]) > 0

        # Per question details
        results = data["per_question_results"]
        assert len(results) == 2
        assert results[0]["question_number"] == 1
        assert results[0]["topic"] == "Distributed Consensus & Raft"
        assert results[0]["is_answered"] is True
        assert results[0]["is_evaluated"] is True
        assert len(results[0]["follow_ups"]) == 1
        assert results[0]["follow_ups"][0]["candidate_answer"] is not None

        assert results[1]["question_number"] == 2
        assert results[1]["topic"] == "Distributed Rate Limiter"
    finally:
        app.dependency_overrides.clear()


def test_get_report_incomplete_session_in_progress_409():
    """Verify that an in-progress session rejects report requests with 409 Conflict."""
    session = _build_test_session(status="in_progress")

    mock_db = AsyncMock(spec=AsyncSession)
    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session
    mock_db.execute.return_value = res_session

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    try:
        res = client.get("/api/v1/interviews/mock-report-100/report")
        assert res.status_code == 409
        assert "not completed" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_get_report_incomplete_session_configured_409():
    """Verify that a configured session rejects report requests with 409 Conflict."""
    session = _build_test_session(status="configured")

    mock_db = AsyncMock(spec=AsyncSession)
    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session
    mock_db.execute.return_value = res_session

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    try:
        res = client.get("/api/v1/interviews/mock-report-100/report")
        assert res.status_code == 409
        assert "not completed" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_get_report_missing_session_404():
    """Verify 404 for nonexistent session."""
    mock_db = AsyncMock(spec=AsyncSession)
    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = res_session

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    try:
        res = client.get("/api/v1/interviews/mock-nonexistent/report")
        assert res.status_code == 404
        assert "not found" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.clear()


def test_get_report_completed_without_evaluations():
    """Verify that completed sessions without evaluations return None scores (not zero)."""
    session = _build_test_session()
    pqs = _build_primary_questions()
    ans = _build_answers()

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_report = MagicMock()
    res_report.scalar_one_or_none.return_value = None

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = pqs

    res_ans = MagicMock()
    res_ans.scalars.return_value.all.return_value = ans

    res_evals = MagicMock()
    res_evals.scalars.return_value.all.return_value = []

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [
        res_session,
        res_report,
        res_pqs,
        res_ans,
        res_evals,
        res_fus,
    ]

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    try:
        res = client.get("/api/v1/interviews/mock-report-100/report")
        assert res.status_code == 200
        data = res.json()

        assert data["evaluated_questions"] == 0
        assert data["overall_score"] is None
        assert data["scores"]["overall_score"] is None
        assert data["scores"]["correctness_average"] is None
        assert data["performance_rating"] == "Not Evaluated"
        assert len(data["per_question_results"]) == 2
        assert data["per_question_results"][0]["is_evaluated"] is False
    finally:
        app.dependency_overrides.clear()


def test_get_report_idempotent_existing_report():
    """Verify idempotent behavior: when a report record already exists, it is returned without re-calculation."""
    session = _build_test_session()
    existing_rep = InterviewReportModel(
        id="rep-existing-123",
        session_id=session.id,
        overall_score=8.5,
        correctness_average=9.0,
        technical_depth_average=8.0,
        edge_cases_average=8.0,
        communication_average=9.0,
        total_questions=2,
        answered_questions=2,
        evaluated_questions=2,
        performance_rating="Proficient (Pass)",
        summary_narrative="Existing persisted narrative report.",
        strengths=["Consistency"],
        improvement_areas=["None"],
        study_recommendations=["Study more"],
        per_question_results=[],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock(spec=AsyncSession)
    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_report = MagicMock()
    res_report.scalar_one_or_none.return_value = existing_rep

    mock_db.execute.side_effect = [res_session, res_report]

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    try:
        # GET
        res1 = client.get(f"/api/v1/interviews/{session.id}/report")
        assert res1.status_code == 200
        assert res1.json()["report_id"] == "rep-existing-123"

        # POST alias
        res_session2 = MagicMock()
        res_session2.scalar_one_or_none.return_value = session
        res_report2 = MagicMock()
        res_report2.scalar_one_or_none.return_value = existing_rep
        mock_db.execute.side_effect = [res_session2, res_report2]

        res2 = client.post(f"/api/v1/interviews/{session.id}/report")
        assert res2.status_code == 200
        assert res2.json()["report_id"] == "rep-existing-123"
    finally:
        app.dependency_overrides.clear()


def test_get_report_refresh_flag_updates_record():
    """Verify that refresh=true re-synthesizes the report even if an existing report is present."""
    session = _build_test_session()
    pqs = _build_primary_questions()
    ans = _build_answers()
    evals = _build_evaluations()
    fus = _build_follow_ups()

    existing_rep = InterviewReportModel(
        id="rep-existing-123",
        session_id=session.id,
        overall_score=5.0,
        total_questions=2,
        answered_questions=2,
        evaluated_questions=2,
        performance_rating="Developing",
        summary_narrative="Old report",
        strengths=[],
        improvement_areas=[],
        study_recommendations=[],
        per_question_results=[],
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_report = MagicMock()
    res_report.scalar_one_or_none.return_value = existing_rep

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = pqs

    res_ans = MagicMock()
    res_ans.scalars.return_value.all.return_value = ans

    res_evals = MagicMock()
    res_evals.scalars.return_value.all.return_value = evals

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = fus

    mock_db.execute.side_effect = [
        res_session,
        res_report,
        res_pqs,
        res_ans,
        res_evals,
        res_fus,
    ]

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    try:
        res = client.get(f"/api/v1/interviews/{session.id}/report?refresh=true")
        assert res.status_code == 200
        data = res.json()
        assert data["report_id"] == "rep-existing-123"
        assert data["overall_score"] == 8.3
    finally:
        app.dependency_overrides.clear()


def test_get_report_gemini_fallback_when_unconfigured():
    """Verify deterministic fallback when GEMINI_API_KEY is not configured."""
    session = _build_test_session()
    pqs = _build_primary_questions()
    ans = _build_answers()
    evals = _build_evaluations()

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_report = MagicMock()
    res_report.scalar_one_or_none.return_value = None

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = pqs

    res_ans = MagicMock()
    res_ans.scalars.return_value.all.return_value = ans

    res_evals = MagicMock()
    res_evals.scalars.return_value.all.return_value = evals

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [
        res_session,
        res_report,
        res_pqs,
        res_ans,
        res_evals,
        res_fus,
    ]

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    try:
        with patch.object(settings, "GEMINI_API_KEY", ""):
            res = client.get(f"/api/v1/interviews/{session.id}/report")
            assert res.status_code == 200
            data = res.json()
            assert data["overall_score"] == 8.3
            assert len(data["summary_narrative"]) > 20
            assert "Distributed Systems Architect" in data["summary_narrative"]
    finally:
        app.dependency_overrides.clear()


def test_get_report_database_rollback_on_failure_500():
    """Verify transaction rollback and 500 when database commit fails."""
    session = _build_test_session()
    pqs = _build_primary_questions()
    ans = _build_answers()
    evals = _build_evaluations()

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock(side_effect=Exception("Database lock acquisition timeout"))
    mock_db.rollback = AsyncMock()

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_report = MagicMock()
    res_report.scalar_one_or_none.return_value = None

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = pqs

    res_ans = MagicMock()
    res_ans.scalars.return_value.all.return_value = ans

    res_evals = MagicMock()
    res_evals.scalars.return_value.all.return_value = evals

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [
        res_session,
        res_report,
        res_pqs,
        res_ans,
        res_evals,
        res_fus,
    ]

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    try:
        res = client.get(f"/api/v1/interviews/{session.id}/report")
        assert res.status_code == 500
        assert "database error" in res.json()["detail"].lower()
        mock_db.rollback.assert_awaited_once()
    finally:
        app.dependency_overrides.clear()


def test_calculate_weighted_overall_score_math():
    """Validates the authoritative formula: 40% correctness, 25% depth, 20% edge cases, 15% communication."""
    # 10 across the board
    assert calculate_weighted_overall_score(10.0, 10.0, 10.0, 10.0) == 10.0
    # 0 across the board
    assert calculate_weighted_overall_score(0.0, 0.0, 0.0, 0.0) == 0.0
    # Weighted calculation: 8*0.4 + 6*0.25 + 4*0.2 + 10*0.15 = 3.2 + 1.5 + 0.8 + 1.5 = 7.0
    assert calculate_weighted_overall_score(8.0, 6.0, 4.0, 10.0) == 7.0


def test_get_report_with_aliases_support():
    """Verify camelCase computed aliases on the report response schema."""
    session = _build_test_session()
    pqs = _build_primary_questions()
    ans = _build_answers()
    evals = _build_evaluations()

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session

    res_report = MagicMock()
    res_report.scalar_one_or_none.return_value = None

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = pqs

    res_ans = MagicMock()
    res_ans.scalars.return_value.all.return_value = ans

    res_evals = MagicMock()
    res_evals.scalars.return_value.all.return_value = evals

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [
        res_session,
        res_report,
        res_pqs,
        res_ans,
        res_evals,
        res_fus,
    ]

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    try:
        res = client.get(f"/api/v1/interviews/{session.id}/report")
        assert res.status_code == 200
        data = res.json()

        assert "report_id" in data
        assert "reportId" in data
        assert "session_id" in data
        assert "sessionId" in data
        assert "overall_score" in data
        assert "overallScore" in data
        assert "per_question_results" in data
        assert "perQuestionResults" in data
        assert "scores" in data
        assert "correctness_average" in data["scores"]
        assert "correctnessAverage" in data["scores"]
    finally:
        app.dependency_overrides.clear()
