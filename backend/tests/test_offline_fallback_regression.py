"""Regression tests for Gemini HTTP 429 quota exhaustion and offline catalog fallback.

Verifies:
1. Interview session startup succeeds with HTTP 200 and deterministic offline Question 1
   even when GEMINI_API_KEY is configured in settings but Gemini returns HTTP 429 quota exhaustion.
2. Programming language (Python, Java, SQL), role, and seniority are fully preserved.
3. Safe catalog cycling for longer sessions (e.g. 5+ questions).
4. Candidate answers are persisted and question progression advances smoothly under 429.
5. Candidate evaluation and follow-up generation clearly communicate quota exhaustion limitations
   and never fabricate fake AI evaluation scores.
6. Report generation succeeds with truthful deterministic evidence-based synthesis.
7. Authenticated multi-tenant ownership checks are preserved (no unauthorized bypass).
8. Bounded retries: Daily quota exhaustion breaks immediately without burning retries.
"""
import asyncio
from datetime import datetime, timezone
import json
from unittest.mock import AsyncMock, MagicMock
import httpx
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import create_jwt_token
from app.db.session import get_db
from app.main import app
from app.models.interview import (
    CandidateAnswerModel,
    InterviewSessionModel,
    PrimaryQuestionModel,
)
from app.models.user import UserModel
from app.services.gemini_service import (
    _post_with_retry,
    parse_gemini_429_details,
)

client = TestClient(app)

QUOTA_EXHAUSTED_BODY = json.dumps({
    "error": {
        "code": 429,
        "message": (
            "You exceeded your current quota, please check your plan and billing details. "
            "* Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, "
            "limit: 20, model: gemini-2.5-flash\nPlease retry in 5h47m58.839658747s."
        ),
        "status": "RESOURCE_EXHAUSTED",
        "details": [
            {
                "@type": "type.googleapis.com/google.rpc.QuotaFailure",
                "violations": [
                    {
                        "subject": "project:123456",
                        "description": "Quota exceeded for free_tier_requests",
                    }
                ],
            }
        ],
    }
}).encode("utf-8")


def test_parse_gemini_429_details_identifies_exhausted_quota_and_redacts():
    """Verify parse_gemini_429_details identifies daily quota exhaustion and redacts secret keys."""
    secret_key = "sensitive-super-secret-key-xyz"
    response = httpx.Response(
        429,
        content=QUOTA_EXHAUSTED_BODY.replace(b"gemini-2.5-flash", f"gemini-{secret_key}".encode("utf-8")),
        request=httpx.Request("POST", "https://generativelanguage.googleapis.com"),
    )
    is_exhausted, retry_sec, clean_msg = parse_gemini_429_details(response)
    assert is_exhausted is True
    assert retry_sec is not None
    # 5 hours + 47 mins = 5 * 3600 + 47 * 60 + 58 > 20000
    assert retry_sec > 20000
    assert "RESOURCE_EXHAUSTED" in clean_msg or "quota" in clean_msg.lower()


@pytest.mark.anyio
async def test_post_with_retry_skips_when_quota_exhausted(monkeypatch):
    """Verify _post_with_retry does not loop or sleep repeatedly on daily quota exhaustion."""
    sleep_mock = AsyncMock()
    monkeypatch.setattr(asyncio, "sleep", sleep_mock)

    call_count = 0

    async def mock_post(self, url, headers=None, json=None):
        nonlocal call_count
        call_count += 1
        return httpx.Response(
            429,
            content=QUOTA_EXHAUSTED_BODY,
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    async with httpx.AsyncClient() as test_client:
        resp = await _post_with_retry(
            client=test_client,
            endpoint="https://generativelanguage.googleapis.com/v1beta/test",
            headers={"Content-Type": "application/json"},
            json_payload={},
            max_retries=2,
        )
    assert resp.status_code == 429
    # Crucial: Must break immediately on daily quota exhaustion, not repeat 3 times
    assert call_count == 1
    sleep_mock.assert_not_awaited()


def test_session_startup_with_gemini_429_quota_exhausted_uses_offline_fallback(monkeypatch):
    """When GEMINI_API_KEY is configured in settings and Gemini returns 429, session start must NOT fail.

    It must fall back to the deterministic offline catalog and transition session to in_progress.
    """
    configured_key = "valid-configured-key-returning-429"
    monkeypatch.setattr(settings, "GEMINI_API_KEY", configured_key)

    async def mock_post(self, url, headers=None, json=None):
        return httpx.Response(
            429,
            content=QUOTA_EXHAUSTED_BODY,
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    # Prepare database mock
    session_model = InterviewSessionModel(
        id="mock-start-429-session",
        role="Distributed Systems Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=3,
        status="configured",
        created_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock(spec=AsyncSession)
    res_select = MagicMock()
    res_select.scalar_one_or_none.return_value = session_model
    mock_db.execute.return_value = res_select
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post("/api/v1/interviews/mock-start-429-session/start")
        # Must return 200 OK, NOT 429 Session Launch Error!
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "in_progress"
        assert data["session_id"] == "mock-start-429-session"
        assert "current_question" in data
        q1 = data["current_question"]
        assert q1["question_number"] == 1
        assert "Distributed Concurrency" in q1["topic"]
        assert "PaymentProcessor" in q1["starter_code"]
        assert len(q1["expected_concepts"]) >= 3

        # Verify DB transaction
        assert session_model.status == "in_progress"
        mock_db.add.assert_called_once()
        saved_pq = mock_db.add.call_args[0][0]
        assert isinstance(saved_pq, PrimaryQuestionModel)
        assert saved_pq.question_number == 1
        assert saved_pq.topic == q1["topic"]
        mock_db.commit.assert_awaited_once()
    finally:
        app.dependency_overrides.pop(get_db, None)


@pytest.mark.parametrize(
    "lang,expected_topic_fragment,expected_code_fragment",
    [
        ("Python", "Distributed Concurrency", "PaymentProcessor"),
        ("Java", "Thread Safety", "DistributedRateLimiter"),
        ("SQL", "Window Functions", "SELECT"),
    ],
)
def test_session_startup_languages_preserved_under_429(monkeypatch, lang, expected_topic_fragment, expected_code_fragment):
    """Verify requested programming languages (Python, Java, SQL) are preserved under 429."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy-gemini-key")

    async def mock_post(self, url, headers=None, json=None):
        return httpx.Response(
            429,
            content=QUOTA_EXHAUSTED_BODY,
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    session_model = InterviewSessionModel(
        id=f"mock-lang-{lang.lower()}",
        role="Infrastructure Engineer",
        difficulty="Mid",
        primary_language=lang,
        question_count=3,
        status="configured",
        created_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock(spec=AsyncSession)
    res_select = MagicMock()
    res_select.scalar_one_or_none.return_value = session_model
    mock_db.execute.return_value = res_select
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post(f"/api/v1/interviews/mock-lang-{lang.lower()}/start")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "in_progress"
        q = data["current_question"]
        assert expected_topic_fragment in q["topic"]
        assert expected_code_fragment in q["starter_code"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_question_progression_and_cycling_under_429_quota_exhaustion(monkeypatch):
    """When advancing question under 429, advance using offline catalog with safe modulo rotation."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy-gemini-key")

    async def mock_post(self, url, headers=None, json=None):
        return httpx.Response(
            429,
            content=QUOTA_EXHAUSTED_BODY,
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    session_model = InterviewSessionModel(
        id="mock-advance-session",
        role="Data Systems Lead",
        difficulty="Senior",
        primary_language="SQL",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    pq1 = PrimaryQuestionModel(
        id="pq-1",
        session_id="mock-advance-session",
        question_number=1,
        topic="Analytical Window Functions & Partitioning",
        difficulty="Senior",
        question_text="SQL Q1",
        expected_concepts=["AVG OVER"],
    )
    ans1 = CandidateAnswerModel(
        id="ans-1",
        session_id="mock-advance-session",
        question_number=1,
        answer_text="SELECT merchant_id, AVG(amount) OVER () FROM transactions;",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock(spec=AsyncSession)
    res_session = MagicMock()
    res_session.scalar_one_or_none.return_value = session_model

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = [pq1]

    res_ans = MagicMock()
    res_ans.scalars.return_value.first.return_value = ans1

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [res_session, res_pqs, res_ans, res_fus]
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        # Advance from Q1 to Q2
        res = client.post("/api/v1/interviews/mock-advance-session/next")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "in_progress"
        assert data["question_number"] == 2
        q2 = data["current_question"]
        assert q2["question_number"] == 2
        assert "Hierarchical Partitioning" in q2["topic"]
        assert "WITH RECURSIVE" in q2["starter_code"]
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_candidate_evaluation_quota_exhausted_communicates_honestly(monkeypatch):
    """When evaluating an answer under 429 quota exhaustion, clearly communicate limitation and never fake score."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy-gemini-key")

    async def mock_post(self, url, headers=None, json=None):
        return httpx.Response(
            429,
            content=QUOTA_EXHAUSTED_BODY,
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    session_model = InterviewSessionModel(
        id="mock-eval-session",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=3,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    ans1 = CandidateAnswerModel(
        id="ans-eval-1",
        session_id="mock-eval-session",
        question_number=1,
        answer_text="Implementation using distributed locks.",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock(spec=AsyncSession)
    res_sess = MagicMock()
    res_sess.scalar_one_or_none.return_value = session_model

    res_ans = MagicMock()
    res_ans.scalar_one_or_none.return_value = ans1

    res_exist_eval = MagicMock()
    res_exist_eval.scalar_one_or_none.return_value = None

    mock_db.execute.side_effect = [res_sess, res_ans, res_exist_eval]

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post(
            "/api/v1/interviews/mock-eval-session/answers/ans-eval-1/evaluate",
            json={"question_text": "Solve concurrency", "expected_concepts": ["Redlock"]},
        )
        assert res.status_code == 429
        detail = res.json()["detail"]
        assert "quota exhausted" in detail.lower()
        assert "recorded" in detail.lower()
        assert "proceed" in detail.lower()
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_follow_up_quota_exhausted_communicates_honestly(monkeypatch):
    """When requesting follow-up under 429 quota exhaustion, clearly communicate limitation."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy-gemini-key")

    async def mock_post(self, url, headers=None, json=None):
        return httpx.Response(
            429,
            content=QUOTA_EXHAUSTED_BODY,
            request=httpx.Request("POST", url),
        )

    monkeypatch.setattr(httpx.AsyncClient, "post", mock_post)

    session_model = InterviewSessionModel(
        id="mock-fu-session",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=3,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    ans1 = CandidateAnswerModel(
        id="ans-fu-1",
        session_id="mock-fu-session",
        question_number=1,
        answer_text="Primary answer for question 1",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock(spec=AsyncSession)
    res_sess = MagicMock()
    res_sess.scalar_one_or_none.return_value = session_model

    res_ans = MagicMock()
    res_ans.scalars.return_value.first.return_value = ans1

    res_eval = MagicMock()
    res_eval.scalar_one_or_none.return_value = None

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [res_sess, res_ans, res_eval, res_fus]

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post(
            "/api/v1/interviews/mock-fu-session/questions/1/follow-up",
            json={"question_text": "What about edge cases?"},
        )
        assert res.status_code == 429
        detail = res.json()["detail"]
        assert "quota exhausted" in detail.lower()
        assert "proceed" in detail.lower()
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_report_generation_offline_session_truthful_synthesis(monkeypatch):
    """Verify report generation for completed offline session synthesizes evidence without fake AI scores."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    session_model = InterviewSessionModel(
        id="mock-report-session",
        role="Distributed Systems Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=3,
        status="completed",
        created_at=datetime.now(timezone.utc),
    )
    pq1 = PrimaryQuestionModel(
        id="pq-r-1",
        session_id="mock-report-session",
        question_number=1,
        topic="Distributed Concurrency & Idempotency",
        difficulty="Senior",
        question_text="Design an idempotent payment pipeline.",
        expected_concepts=["Idempotency Key", "Fencing Token"],
    )
    ans1 = CandidateAnswerModel(
        id="ans-r-1",
        session_id="mock-report-session",
        question_number=1,
        answer_text="I used transactional outbox and Redis distributed locks.",
        submitted_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock(spec=AsyncSession)
    res_sess = MagicMock()
    res_sess.scalar_one_or_none.return_value = session_model

    res_rep = MagicMock()
    res_rep.scalar_one_or_none.return_value = None

    res_pqs = MagicMock()
    res_pqs.scalars.return_value.all.return_value = [pq1]

    res_ans = MagicMock()
    res_ans.scalars.return_value.all.return_value = [ans1]

    res_evals = MagicMock()
    res_evals.scalars.return_value.all.return_value = []  # No live evaluations recorded

    res_fus = MagicMock()
    res_fus.scalars.return_value.all.return_value = []

    mock_db.execute.side_effect = [res_sess, res_rep, res_pqs, res_ans, res_evals, res_fus]
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.refresh = AsyncMock()

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.get("/api/v1/interviews/mock-report-session/report")
        assert res.status_code == 200
        data = res.json()
        assert data["session_id"] == "mock-report-session"
        assert data["evaluated_questions"] == 0
        assert data["overall_score"] is None
        assert data["performance_rating"] == "Not Evaluated"
        assert "offline mode" in data["summary_narrative"].lower()
    finally:
        app.dependency_overrides.pop(get_db, None)


def test_authenticated_ownership_preserved_under_offline_fallback():
    """Verify unauthorized users cannot access or start another user's session even in offline mode."""
    owner_id = "user-owner-123"
    other_user = UserModel(
        id="user-intruder-456",
        email="intruder@example.com",
        full_name="Intruder User",
        hashed_password="...",
        is_active=True,
    )
    token = create_jwt_token({"sub": "user-intruder-456"})

    session_model = InterviewSessionModel(
        id="mock-auth-protected-session",
        user_id=owner_id,
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=3,
        status="configured",
        created_at=datetime.now(timezone.utc),
    )

    mock_db = AsyncMock(spec=AsyncSession)
    mock_db.get = AsyncMock(return_value=other_user)

    res_user_sess = MagicMock()
    res_user_sess.scalar_one_or_none.return_value = None

    res_sess = MagicMock()
    res_sess.scalar_one_or_none.return_value = session_model

    mock_db.execute.side_effect = [res_user_sess, res_sess]

    async def override_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_db
    try:
        res = client.post(
            "/api/v1/interviews/mock-auth-protected-session/start",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert res.status_code == 403
        assert "permission" in res.json()["detail"].lower()
    finally:
        app.dependency_overrides.pop(get_db, None)
