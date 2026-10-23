from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
import pytest
from fastapi.testclient import TestClient

from app.core.config import settings
from app.db.session import get_db
from app.main import app
from app.models.interview import InterviewSessionModel, PrimaryQuestionModel
from app.models.user import UserModel, UserSessionModel
from app.core.security import hash_token
from app.services.voice_service import (
    VoiceServiceNotConfiguredError,
    VoiceServiceProviderError,
    request_realtime_session,
)


@pytest.fixture
def voice_mock_db():
    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.commit = AsyncMock()
    mock_db.rollback = AsyncMock()
    mock_db.refresh = AsyncMock()

    async def override_get_db():
        yield mock_db

    app.dependency_overrides[get_db] = override_get_db
    yield mock_db
    app.dependency_overrides.pop(get_db, None)


client = TestClient(app)


# =====================================================================
# Unit Tests for voice_service.py
# =====================================================================

@pytest.mark.anyio
async def test_request_realtime_session_raises_when_unconfigured(monkeypatch):
    """Verify VoiceServiceNotConfiguredError is raised when OPENAI_API_KEY is not set."""
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)

    with pytest.raises(VoiceServiceNotConfiguredError, match="OPENAI_API_KEY is not set"):
        await request_realtime_session(
            role="Backend Engineer",
            difficulty="Senior",
            language="Python",
            question_text="Explain async/await in Python",
            topic="Async I/O",
        )


@pytest.mark.anyio
async def test_request_realtime_session_success(monkeypatch):
    """Verify request_realtime_session correctly calls official client_secrets endpoint and parses value."""
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-proj-mock-key-for-testing")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "value": "ek_test_ephemeral_token_abc123",
        "expires_at": 1729000000,
        "session": {
            "id": "sess_123",
            "object": "realtime.session",
            "model": "gpt-realtime",
        },
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        res = await request_realtime_session(
            role="Distributed Systems Engineer",
            difficulty="Staff",
            language="Java",
            question_text="Design a distributed consensus mechanism",
            topic="Raft & Paxos",
        )

        assert res["client_secret"] == "ek_test_ephemeral_token_abc123"
        assert res["expires_at"] == 1729000000
        assert res["model"] == "gpt-realtime"
        assert res["voice"] == settings.OPENAI_REALTIME_VOICE

        # Verify called URL is the official client_secrets endpoint
        called_url = mock_post.call_args[0][0]
        assert called_url == "https://api.openai.com/v1/realtime/client_secrets"

        # Verify payload follows current official client_secrets schema
        called_payload = mock_post.call_args[1]["json"]
        assert called_payload["expires_after"] == {"anchor": "created_at", "seconds": 600}
        assert called_payload["session"]["type"] == "realtime"
        assert called_payload["session"]["model"] == settings.OPENAI_REALTIME_MODEL
        assert "Distributed Systems Engineer" in called_payload["session"]["instructions"]
        assert "Raft & Paxos" in called_payload["session"]["instructions"]
        assert "advance the interview through the platform" in called_payload["session"]["instructions"]
        assert called_payload["session"]["audio"]["input"]["transcription"] == {"model": "whisper-1"}
        assert called_payload["session"]["audio"]["output"]["voice"] == settings.OPENAI_REALTIME_VOICE


@pytest.mark.anyio
async def test_request_realtime_session_legacy_format_fallback(monkeypatch):
    """Verify request_realtime_session falls back gracefully to legacy client_secret dict structure."""
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-proj-mock-key-for-testing")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "client_secret": {
            "value": "ek_legacy_preview_token_456",
            "expires_at": 1729001111,
        },
        "model": "gpt-realtime",
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        res = await request_realtime_session(
            role="Backend Engineer",
            difficulty="Mid",
            language="Python",
            question_text="Explain decorators",
            topic="Metaprogramming",
        )

        assert res["client_secret"] == "ek_legacy_preview_token_456"
        assert res["expires_at"] == 1729001111


@pytest.mark.anyio
async def test_request_realtime_session_upstream_error_raises_provider_error(monkeypatch):
    """Verify upstream HTTP error raises VoiceServiceProviderError without leaking key."""
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-proj-mock-key-for-testing")

    mock_response = MagicMock(spec=httpx.Response)
    mock_response.status_code = 401
    mock_response.json.return_value = {
        "error": {
            "message": "Incorrect API key provided",
            "type": "invalid_request_error",
        }
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_response

        with pytest.raises(VoiceServiceProviderError, match="HTTP 401"):
            await request_realtime_session(
                role="Backend Engineer",
                difficulty="Senior",
                language="Python",
                question_text="Explain Python GIL",
                topic="Concurrency",
            )


# =====================================================================
# API Endpoint Integration Tests: POST /api/v1/interviews/{session_id}/voice/session
# =====================================================================

def test_voice_session_unconfigured_returns_503(voice_mock_db, monkeypatch):
    """Verify 503 is returned when OPENAI_API_KEY is not set in backend settings."""
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)

    session = InterviewSessionModel(
        id="mock-voice-sess-1",
        user_id=None,
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    pq = PrimaryQuestionModel(
        id="pq-1",
        session_id="mock-voice-sess-1",
        question_number=1,
        topic="Async Concurrency",
        difficulty="Senior",
        question_text="Explain event loops",
        created_at=datetime.now(timezone.utc),
    )

    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = session
    pq_res = MagicMock()
    pq_res.scalars.return_value.first.return_value = pq

    voice_mock_db.execute = AsyncMock(side_effect=[sess_res, pq_res])

    response = client.post("/api/v1/interviews/mock-voice-sess-1/voice/session")
    assert response.status_code == 503
    assert "OPENAI_API_KEY is not set" in response.json()["detail"]


def test_voice_session_missing_session_returns_404(voice_mock_db):
    """Verify 404 Not Found when session does not exist."""
    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = None
    voice_mock_db.execute = AsyncMock(return_value=sess_res)

    response = client.post("/api/v1/interviews/non-existent-session/voice/session")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_voice_session_unauthenticated_on_user_session_returns_401(voice_mock_db):
    """Verify 401 Unauthorized when accessing a user-owned session without token."""
    session = InterviewSessionModel(
        id="mock-user-session",
        user_id="usr-owner-123",
        role="Frontend Engineer",
        difficulty="Mid",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = session
    voice_mock_db.execute = AsyncMock(return_value=sess_res)

    response = client.post("/api/v1/interviews/mock-user-session/voice/session")
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]


def test_voice_session_cross_tenant_forbidden_returns_403(voice_mock_db):
    """Verify 403 Forbidden when User B requests voice credentials for User A's session."""
    user_b = UserModel(
        id="usr-tenant-b",
        email="tenant_b@example.com",
        full_name="Tenant B",
        hashed_password="hash",
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session_a = InterviewSessionModel(
        id="mock-tenant-a-voice-sess",
        user_id="usr-tenant-a",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    sess_b = UserSessionModel(
        id="sess-b-tok-voice",
        user_id="usr-tenant-b",
        token_hash=hash_token("token-tenant-b-voice"),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        created_at=datetime.now(timezone.utc),
    )
    sess_b.user = user_b

    auth_res = MagicMock()
    auth_res.scalar_one_or_none.return_value = sess_b

    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = session_a

    voice_mock_db.execute = AsyncMock(side_effect=[auth_res, sess_res])

    headers = {"Authorization": "Bearer token-tenant-b-voice"}
    response = client.post(
        "/api/v1/interviews/mock-tenant-a-voice-sess/voice/session",
        headers=headers,
    )
    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]


def test_voice_session_completed_returns_409(voice_mock_db):
    """Verify 409 Conflict when attempting to start voice on an already completed session."""
    session = InterviewSessionModel(
        id="mock-completed-voice-sess",
        user_id=None,
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="completed",
        created_at=datetime.now(timezone.utc),
    )
    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = session
    voice_mock_db.execute = AsyncMock(return_value=sess_res)

    response = client.post("/api/v1/interviews/mock-completed-voice-sess/voice/session")
    assert response.status_code == 409
    assert "already been completed" in response.json()["detail"]


def test_voice_session_unstarted_no_questions_returns_400(voice_mock_db):
    """Verify 400 Bad Request when session has no generated technical questions."""
    session = InterviewSessionModel(
        id="mock-configured-voice-sess",
        user_id=None,
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="configured",
        created_at=datetime.now(timezone.utc),
    )
    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = session

    pq_res = MagicMock()
    pq_res.scalars.return_value.first.return_value = None

    voice_mock_db.execute = AsyncMock(side_effect=[sess_res, pq_res])

    response = client.post("/api/v1/interviews/mock-configured-voice-sess/voice/session")
    assert response.status_code == 400
    assert "No technical question found" in response.json()["detail"]


def test_voice_session_success_mints_ephemeral_token(voice_mock_db, monkeypatch):
    """Verify successful voice session returns ephemeral client_secret and interview context."""
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "sk-proj-valid-secret-key-for-test")

    session = InterviewSessionModel(
        id="mock-active-sess-success",
        user_id=None,
        role="Systems Engineer",
        difficulty="Staff",
        primary_language="Java",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    pq = PrimaryQuestionModel(
        id="pq-active-1",
        session_id="mock-active-sess-success",
        question_number=1,
        topic="Memory Models",
        difficulty="Staff",
        question_text="Explain the Java Memory Model and happens-before guarantees.",
        created_at=datetime.now(timezone.utc),
    )

    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = session

    pq_res = MagicMock()
    pq_res.scalars.return_value.first.return_value = pq

    voice_mock_db.execute = AsyncMock(side_effect=[sess_res, pq_res])

    mock_openai_res = MagicMock(spec=httpx.Response)
    mock_openai_res.status_code = 200
    mock_openai_res.json.return_value = {
        "value": "ek_ephemeral_client_token_xyz987",
        "expires_at": 1729000500,
        "session": {
            "id": "sess_live_123",
            "model": "gpt-realtime",
        },
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_openai_res

        response = client.post("/api/v1/interviews/mock-active-sess-success/voice/session")

        assert response.status_code == 200
        data = response.json()
        assert data["session_id"] == "mock-active-sess-success"
        assert data["client_secret"] == "ek_ephemeral_client_token_xyz987"
        assert data["expires_at"] == 1729000500
        assert data["model"] == "gpt-realtime"
        assert data["voice"] == settings.OPENAI_REALTIME_VOICE
        assert data["question_number"] == 1
        assert "Java Memory Model" in data["question_text"]
        assert data["topic"] == "Memory Models"
        assert data["role"] == "Systems Engineer"

        # Verify permanent API key is NEVER exposed in the response
        assert "sk-proj-valid-secret-key-for-test" not in response.text


# =====================================================================
# Unit & Integration Tests for Zero-Cost Voice Mode (POST /voice/interact)
# =====================================================================

@pytest.mark.anyio
async def test_generate_voice_conversational_reply_with_gemini_success(monkeypatch):
    """Verify generate_voice_conversational_reply calls Gemini and parses natural reply."""
    from app.services.voice_service import generate_voice_conversational_reply
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-gemini-key")

    mock_res = MagicMock(spec=httpx.Response)
    mock_res.status_code = 200
    mock_res.json.return_value = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": "Great start. How does your two-pointer approach handle duplicate items?"
                        }
                    ]
                }
            }
        ]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_res

        reply, is_offline = await generate_voice_conversational_reply(
            role="Backend Engineer",
            difficulty="Senior",
            language="Python",
            question_text="Two sum in sorted array",
            topic="Two Pointers",
            candidate_speech="I will use left and right pointers moving inward.",
            expected_concepts=["Two Pointers", "O(N) time"],
        )

        assert not is_offline
        assert "two-pointer approach" in reply


@pytest.mark.anyio
async def test_generate_voice_conversational_reply_offline_when_unconfigured(monkeypatch):
    """Verify generate_voice_conversational_reply falls back cleanly to offline templates when key is missing."""
    from app.services.voice_service import generate_voice_conversational_reply
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)

    reply, is_offline = await generate_voice_conversational_reply(
        role="Backend Engineer",
        difficulty="Senior",
        language="Python",
        question_text="Design distributed rate limiter",
        topic="Rate Limiting",
        candidate_speech="I will use a sliding window with Redis sorted sets.",
        expected_concepts=["Sliding Window Log", "Redis ZADD"],
    )

    assert is_offline is True
    assert ("Sliding Window Log" in reply or "failure modes" in reply or "bottleneck" in reply)


@pytest.mark.anyio
async def test_generate_voice_conversational_reply_quota_exhausted_fallback(monkeypatch):
    """Verify generate_voice_conversational_reply falls back cleanly when Gemini returns HTTP 429."""
    from app.services.voice_service import generate_voice_conversational_reply
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-gemini-key")

    mock_res = MagicMock(spec=httpx.Response)
    mock_res.status_code = 429
    mock_res.text = "RESOURCE_EXHAUSTED"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_res

        reply, is_offline = await generate_voice_conversational_reply(
            role="Systems Engineer",
            difficulty="Staff",
            language="Java",
            question_text="Design off-heap buffer ring",
            topic="Off-Heap Memory",
            candidate_speech="I will use sun.misc.Unsafe to allocate direct memory.",
            expected_concepts=["Off-Heap Safety", "Memory Leak Mitigation"],
        )

        assert is_offline is True
        assert len(reply) > 10


def test_voice_interact_endpoint_success(voice_mock_db, monkeypatch):
    """Verify POST /{session_id}/voice/interact returns synthesized interviewer response."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)  # Safe offline fallback

    session = InterviewSessionModel(
        id="mock-voice-interact-sess",
        user_id=None,
        role="Frontend Engineer",
        difficulty="Senior",
        primary_language="TypeScript",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    pq = PrimaryQuestionModel(
        id="pq-vi-1",
        session_id="mock-voice-interact-sess",
        question_number=1,
        topic="Virtual DOM & React Fiber",
        difficulty="Senior",
        question_text="Explain work loop and priority lanes in React 18.",
        expected_concepts=["Fiber Node Architecture", "Concurrent Lanes"],
        created_at=datetime.now(timezone.utc),
    )

    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = session

    pq_res = MagicMock()
    pq_res.scalars.return_value.first.return_value = pq

    voice_mock_db.execute = AsyncMock(side_effect=[sess_res, pq_res])

    response = client.post(
        "/api/v1/interviews/mock-voice-interact-sess/voice/interact",
        json={
            "question_number": 1,
            "candidate_speech": "Fiber nodes represent unit of work in a doubly linked tree.",
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert data["session_id"] == "mock-voice-interact-sess"
    assert data["question_number"] == 1
    assert data["is_offline"] is True
    assert len(data["interviewer_reply"]) > 10


def test_voice_interact_unauthenticated_on_user_session_returns_401(voice_mock_db):
    """Verify 401 Unauthorized when unauthenticated candidate calls voice/interact on user session."""
    session = InterviewSessionModel(
        id="mock-user-voice-sess",
        user_id="usr-owner-456",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = session
    voice_mock_db.execute = AsyncMock(return_value=sess_res)

    response = client.post(
        "/api/v1/interviews/mock-user-voice-sess/voice/interact",
        json={"question_number": 1, "candidate_speech": "My approach..."},
    )
    assert response.status_code == 401


def test_voice_interact_completed_session_returns_409(voice_mock_db):
    """Verify 409 Conflict when attempting voice interact on completed session."""
    session = InterviewSessionModel(
        id="mock-completed-voice-sess-2",
        user_id=None,
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="completed",
        created_at=datetime.now(timezone.utc),
    )
    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = session
    voice_mock_db.execute = AsyncMock(return_value=sess_res)

    response = client.post(
        "/api/v1/interviews/mock-completed-voice-sess-2/voice/interact",
        json={"question_number": 1, "candidate_speech": "My approach..."},
    )
    assert response.status_code == 409


@pytest.mark.anyio
async def test_generate_voice_conversational_reply_gemini_500_fallback(monkeypatch):
    """Verify generate_voice_conversational_reply falls back cleanly when Gemini returns HTTP 500."""
    from app.services.voice_service import generate_voice_conversational_reply
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-gemini-key")

    mock_res = MagicMock(spec=httpx.Response)
    mock_res.status_code = 500
    mock_res.text = "Internal Server Error"

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = mock_res

        reply, is_offline = await generate_voice_conversational_reply(
            role="Data Engineer",
            difficulty="Senior",
            language="Python",
            question_text="Design streaming ETL with Apache Kafka",
            topic="Streaming Architecture",
            candidate_speech="I will use Kafka Streams for exactly-once processing.",
            expected_concepts=["Kafka Streams", "Exactly-Once Semantics"],
        )

        assert is_offline is True
        assert len(reply) > 10


@pytest.mark.anyio
async def test_generate_voice_conversational_reply_network_error_fallback(monkeypatch):
    """Verify generate_voice_conversational_reply falls back cleanly on network timeouts without crashing."""
    from app.services.voice_service import generate_voice_conversational_reply
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-gemini-key")

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.side_effect = httpx.ConnectTimeout("Connection timed out to Google APIs")

        reply, is_offline = await generate_voice_conversational_reply(
            role="Cloud Architect",
            difficulty="Lead",
            language="Go",
            question_text="Architect multi-region failover",
            topic="High Availability",
            candidate_speech="We will use Anycast DNS and active-passive data replication.",
            expected_concepts=["Anycast Routing", "Replication Lag"],
        )

        assert is_offline is True
        assert len(reply) > 10


@pytest.mark.anyio
async def test_generate_voice_conversational_reply_concept_grounding(monkeypatch):
    """Verify offline fallback templates incorporate expected architectural concepts."""
    from app.services.voice_service import generate_voice_conversational_reply
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)

    concepts = ["B-Tree Indexes", "Write Amplification"]
    reply, is_offline = await generate_voice_conversational_reply(
        role="Database Engineer",
        difficulty="Senior",
        language="C++",
        question_text="LSM-Trees vs B-Trees",
        topic="Storage Engines",
        candidate_speech="LSM trees append writes sequentially to WAL and memtable.",
        expected_concepts=concepts,
    )

    assert is_offline is True
    # Verify that at least one of the expected concepts or architectural themes is grounded
    assert any(c in reply for c in concepts) or "bottleneck" in reply or "complexity" in reply


def test_voice_interact_empty_speech_returns_422():
    """Verify Pydantic rejects empty or missing candidate_speech with 422 Unprocessable Entity."""
    response = client.post(
        "/api/v1/interviews/some-session-id/voice/interact",
        json={"question_number": 1, "candidate_speech": ""},
    )
    assert response.status_code == 422


def test_voice_interact_missing_question_returns_400(voice_mock_db):
    """Verify 400 Bad Request when session has no questions generated yet."""
    session = InterviewSessionModel(
        id="mock-unstarted-voice-sess",
        user_id=None,
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="configured",
        created_at=datetime.now(timezone.utc),
    )
    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = session

    pq_res = MagicMock()
    pq_res.scalars.return_value.first.return_value = None

    voice_mock_db.execute = AsyncMock(side_effect=[sess_res, pq_res])

    response = client.post(
        "/api/v1/interviews/mock-unstarted-voice-sess/voice/interact",
        json={"question_number": 1, "candidate_speech": "My approach..."},
    )
    assert response.status_code == 400
    assert "No technical question found" in response.json()["detail"]


def test_voice_interact_cross_tenant_forbidden_returns_403(voice_mock_db):
    """Verify candidate B receives 403 Forbidden when calling voice interact on candidate A's session."""
    user_b = UserModel(
        id="usr-tenant-b-interact",
        email="tenant_b_interact@example.com",
        full_name="Tenant B",
        hashed_password="pw",
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    sess_b = UserSessionModel(
        id="sess-b-tok-interact",
        user_id="usr-tenant-b-interact",
        token_hash=hash_token("token-tenant-b-interact"),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        created_at=datetime.now(timezone.utc),
    )
    sess_b.user = user_b

    session_a = InterviewSessionModel(
        id="mock-tenant-a-interact-sess",
        user_id="usr-tenant-a-owner",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )

    auth_res = MagicMock()
    auth_res.scalar_one_or_none.return_value = sess_b

    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = session_a

    voice_mock_db.execute = AsyncMock(side_effect=[auth_res, sess_res])

    headers = {"Authorization": "Bearer token-tenant-b-interact"}
    response = client.post(
        "/api/v1/interviews/mock-tenant-a-interact-sess/voice/interact",
        headers=headers,
        json={"question_number": 1, "candidate_speech": "My cross-tenant speech"},
    )
    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]



