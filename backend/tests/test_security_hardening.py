from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock
import pytest
from fastapi import Response
from fastapi.testclient import TestClient

from app.core.config import DEV_DEFAULT_SECRET_KEY, Settings, settings
from app.api.v1.endpoints.auth import set_auth_cookie
from app.main import app
from app.models.interview import InterviewSessionModel
from app.models.user import UserModel, UserSessionModel
from app.core.security import hash_token
from app.db.session import get_db


VALID_PROD_SECRET = "super-secure-production-jwt-hmac-key-2026-min-32-chars!"
VALID_PROD_ORIGINS = ["https://mockinterview.ai", "https://app.mockinterview.ai"]


# =====================================================================
# 1. Production Secrets Protection Tests
# =====================================================================

def test_production_rejected_with_default_secret():
    """Verify production settings reject the known development default SECRET_KEY."""
    with pytest.raises(ValueError, match="default SECRET_KEY"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY=DEV_DEFAULT_SECRET_KEY,
            CORS_ORIGINS=VALID_PROD_ORIGINS,
        )


def test_production_rejected_with_missing_or_empty_secret():
    """Verify production settings reject a missing or empty SECRET_KEY."""
    with pytest.raises(ValueError, match="SECRET_KEY is missing"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY="",
            CORS_ORIGINS=VALID_PROD_ORIGINS,
        )


@pytest.mark.parametrize("weak_secret", [
    "short-secret",
    "password",
    "changeme",
    "admin",
    "your_jwt_secret_key_here",
    "12345678",
    "mockinterviewer",
])
def test_production_rejected_with_insecure_or_short_secret(weak_secret: str):
    """Verify production settings reject known weak secrets and secrets shorter than 32 characters."""
    with pytest.raises(ValueError, match="(Insecure or default SECRET_KEY|SECRET_KEY is too short)"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY=weak_secret,
            CORS_ORIGINS=VALID_PROD_ORIGINS,
        )


def test_production_accepted_with_valid_secret():
    """Verify production settings accept a strong, 32+ character cryptographic secret."""
    prod_settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY=VALID_PROD_SECRET,
        CORS_ORIGINS=VALID_PROD_ORIGINS,
    )
    assert prod_settings.SECRET_KEY == VALID_PROD_SECRET
    assert prod_settings.is_production is True


def test_production_app_startup_rejected_with_default_secret(monkeypatch):
    """Verify application lifespan startup fails when production is configured with default dev secret."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "SECRET_KEY", DEV_DEFAULT_SECRET_KEY)
    monkeypatch.setattr(settings, "CORS_ORIGINS", VALID_PROD_ORIGINS)

    with pytest.raises(ValueError, match="default SECRET_KEY"):
        with TestClient(app):
            pass


def test_production_app_startup_accepted_with_valid_secret(monkeypatch):
    """Verify application lifespan startup succeeds when production is configured with valid secret."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "SECRET_KEY", VALID_PROD_SECRET)
    monkeypatch.setattr(settings, "CORS_ORIGINS", VALID_PROD_ORIGINS)

    with TestClient(app) as client:
        response = client.get("/")
        assert response.status_code == 200
        assert response.json()["service"] == settings.PROJECT_NAME


# =====================================================================
# 2. Authentication Cookie Security Tests
# =====================================================================

def test_secure_cookies_automatically_enabled_in_production():
    """Verify AUTH_COOKIE_SECURE is automatically enforced as True in production environments."""
    prod_settings = Settings(
        ENVIRONMENT="production",
        SECRET_KEY=VALID_PROD_SECRET,
        CORS_ORIGINS=VALID_PROD_ORIGINS,
        AUTH_COOKIE_SECURE=False,  # Even if initially False, must be forced True in prod
    )
    assert prod_settings.AUTH_COOKIE_SECURE is True


def test_secure_cookies_flag_set_on_cookie_in_production(monkeypatch):
    """Verify set_auth_cookie produces a Set-Cookie header with the 'secure' attribute in production."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "AUTH_COOKIE_SECURE", True)

    response = Response()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    set_auth_cookie(response, "test-secure-token", expires_at)

    cookie_header = response.headers.get("set-cookie", "")
    assert "Secure" in cookie_header or "secure" in cookie_header
    assert "HttpOnly" in cookie_header or "httponly" in cookie_header
    assert "SameSite=lax" in cookie_header or "samesite=lax" in cookie_header
    assert "session_token=test-secure-token" in cookie_header


def test_secure_cookies_flag_omitted_in_development(monkeypatch):
    """Verify set_auth_cookie allows HTTP in development by omitting the 'secure' flag."""
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")
    monkeypatch.setattr(settings, "AUTH_COOKIE_SECURE", False)

    response = Response()
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    set_auth_cookie(response, "test-dev-token", expires_at)

    cookie_header = response.headers.get("set-cookie", "")
    assert "secure" not in cookie_header.lower()
    assert "httponly" in cookie_header.lower()
    assert "samesite=lax" in cookie_header.lower()
    assert "session_token=test-dev-token" in cookie_header


# =====================================================================
# 3. CORS Safety and Origin Restriction Tests
# =====================================================================

def test_wildcard_cors_rejected_for_credentialed_requests():
    """Verify wildcard '*' CORS origin is rejected when credentialed requests are enabled."""
    with pytest.raises(ValueError, match="Wildcard origin '\\*' cannot be used"):
        Settings(
            ENVIRONMENT="development",
            CORS_ORIGINS=["*"],
        )


def test_wildcard_cors_string_rejected():
    """Verify comma-separated or single string wildcard '*' is rejected."""
    with pytest.raises(ValueError, match="Wildcard origin '\\*' cannot be used"):
        Settings(
            ENVIRONMENT="development",
            CORS_ORIGINS="*",
        )


def test_null_cors_origin_rejected():
    """Verify unsafe 'null' origin is rejected."""
    with pytest.raises(ValueError, match="Origin 'null' is unsafe"):
        Settings(
            ENVIRONMENT="development",
            CORS_ORIGINS=["null"],
        )


def test_production_cors_rejects_empty_origins():
    """Verify production configuration rejects empty CORS_ORIGINS."""
    with pytest.raises(ValueError, match="CORS_ORIGINS must not be empty in production"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY=VALID_PROD_SECRET,
            CORS_ORIGINS=[],
        )


def test_production_cors_rejects_localhost_only_origins():
    """Verify production configuration rejects when only localhost/127.0.0.1 origins are supplied."""
    with pytest.raises(ValueError, match="cannot only contain local development origins"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY=VALID_PROD_SECRET,
            CORS_ORIGINS=["http://localhost:5173", "http://127.0.0.1:5173"],
        )


def test_production_cors_rejects_insecure_http_origins():
    """Verify production configuration rejects non-loopback HTTP (non-HTTPS) origins."""
    with pytest.raises(ValueError, match="Insecure HTTP origin is not allowed in production"):
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY=VALID_PROD_SECRET,
            CORS_ORIGINS=["http://insecure-domain.com"],
        )


# =====================================================================
# 4. Local Development Defaults Preservation Tests
# =====================================================================

def test_local_development_configuration_preserved():
    """Verify local development defaults remain intact and functional outside production."""
    dev_settings = Settings(
        ENVIRONMENT="development",
    )
    assert dev_settings.ENVIRONMENT == "development"
    assert dev_settings.is_production is False
    assert dev_settings.SECRET_KEY == DEV_DEFAULT_SECRET_KEY
    assert dev_settings.AUTH_COOKIE_SECURE is False
    assert "http://localhost:5173" in dev_settings.CORS_ORIGINS


# =====================================================================
# 5. Secrets Redaction and Safe Logging Tests
# =====================================================================

def test_secret_key_not_leaked_in_settings_repr():
    """Verify SECRET_KEY and sensitive credentials are hidden from repr(settings)."""
    custom_secret = "my-very-long-super-secret-key-for-test-32chars"
    s = Settings(
        ENVIRONMENT="development",
        SECRET_KEY=custom_secret,
        GEMINI_API_KEY="sensitive-gemini-api-key-12345",
    )
    rendered_repr = repr(s)
    assert custom_secret not in rendered_repr
    assert "sensitive-gemini-api-key-12345" not in rendered_repr


def test_secret_value_not_leaked_in_error_message():
    """Verify configuration error messages never print the actual secret value."""
    secret_candidate = "my-secret-that-must-never-be-printed"
    try:
        Settings(
            ENVIRONMENT="production",
            SECRET_KEY=secret_candidate,
            CORS_ORIGINS=VALID_PROD_ORIGINS,
        )
    except ValueError as exc:
        err_msg = str(exc)
        assert secret_candidate not in err_msg


# =====================================================================
# 6. Session Ownership and Authorization Gap Verification Tests
# =====================================================================

@pytest.fixture
def auth_mock_db():
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


def test_cross_tenant_forbidden_on_submit_answer(auth_mock_db):
    """Verify User B cannot submit an answer to User A's session (403 Forbidden)."""
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
        id="mock-tenant-a-session",
        user_id="usr-tenant-a",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    sess_b = UserSessionModel(
        id="sess-b-tok",
        user_id="usr-tenant-b",
        token_hash=hash_token("token-tenant-b"),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        created_at=datetime.now(timezone.utc),
    )
    sess_b.user = user_b

    # Query 1: Authenticate token for User B
    auth_res = MagicMock()
    auth_res.scalar_one_or_none.return_value = sess_b

    # Query 2: Lookup session record
    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = session_a

    auth_mock_db.execute = AsyncMock(side_effect=[auth_res, sess_res])

    client = TestClient(app)
    headers = {"Authorization": "Bearer token-tenant-b"}
    payload = {
        "question_number": 1,
        "answer_text": "The GIL is a mutex...",
    }

    response = client.post(
        "/api/v1/interviews/mock-tenant-a-session/answer",
        json=payload,
        headers=headers,
    )
    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]


def test_cross_tenant_forbidden_on_report(auth_mock_db):
    """Verify User B cannot access the final report of User A's session (403 Forbidden)."""
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
        id="mock-tenant-a-session-report",
        user_id="usr-tenant-a",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="completed",
        created_at=datetime.now(timezone.utc),
    )
    sess_b = UserSessionModel(
        id="sess-b-tok-2",
        user_id="usr-tenant-b",
        token_hash=hash_token("token-tenant-b-2"),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        created_at=datetime.now(timezone.utc),
    )
    sess_b.user = user_b

    auth_res = MagicMock()
    auth_res.scalar_one_or_none.return_value = sess_b

    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = session_a

    auth_mock_db.execute = AsyncMock(side_effect=[auth_res, sess_res])

    client = TestClient(app)
    headers = {"Authorization": "Bearer token-tenant-b-2"}

    response = client.get(
        "/api/v1/interviews/mock-tenant-a-session-report/report",
        headers=headers,
    )
    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]
