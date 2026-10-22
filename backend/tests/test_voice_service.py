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
