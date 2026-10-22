from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password, verify_password, hash_token, generate_random_token
from app.db.session import get_db
from app.main import app
from app.models.interview import InterviewSessionModel
from app.models.user import UserModel, UserSessionModel, PasswordResetTokenModel


@pytest.fixture(autouse=True)
def mock_db_session():
    """Mock database session for fast, isolated unit tests without requiring a live PostgreSQL instance."""
    mock_session = AsyncMock(spec=AsyncSession)
    mock_session.add = MagicMock()
    mock_session.commit = AsyncMock()
    mock_session.rollback = AsyncMock()
    mock_session.refresh = AsyncMock()

    async def override_get_db():
        yield mock_session

    app.dependency_overrides[get_db] = override_get_db
    client.cookies.clear()
    yield mock_session
    client.cookies.clear()
    app.dependency_overrides.pop(get_db, None)


client = TestClient(app)


def test_password_hashing_and_verification():
    """Verify Argon2id hashing produces valid hashes and verifies correctly."""
    raw_pwd = "SecurePassword123!"
    hashed = hash_password(raw_pwd)
    assert hashed != raw_pwd
    assert hashed.startswith("$argon2id$")
    assert verify_password(raw_pwd, hashed) is True
    assert verify_password("WrongPassword!", hashed) is False


def test_token_hashing_sha256():
    """Verify token hashing produces deterministic SHA-256 hex string."""
    token = "test-token-value-12345"
    h1 = hash_token(token)
    h2 = hash_token(token)
    assert h1 == h2
    assert len(h1) == 64


def test_signup_success(mock_db_session):
    """Verify successful user registration returns 201, user profile, and session cookie."""
    # Mock no existing user with same email
    existing_user_res = MagicMock()
    existing_user_res.scalar_one_or_none.return_value = None
    mock_db_session.execute = AsyncMock(return_value=existing_user_res)

    payload = {
        "full_name": "Jane Developer",
        "email": "jane@example.com",
        "password": "SuperSecretPassword123!",
        "confirm_password": "SuperSecretPassword123!",
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["user"]["email"] == "jane@example.com"
    assert data["user"]["full_name"] == "Jane Developer"
    assert data["user"]["is_active"] is True
    assert data["token_type"] == "bearer"
    assert "session_token" in data
    assert "access_token" in data
    # Verify HttpOnly session cookie was set
    assert "session_token" in response.cookies


def test_signup_duplicate_email_409(mock_db_session):
    """Verify duplicate email registration returns 409 Conflict."""
    existing_user = UserModel(
        id="usr-existing",
        email="existing@example.com",
        full_name="Existing User",
        hashed_password=hash_password("Pass1234!"),
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    existing_res = MagicMock()
    existing_res.scalar_one_or_none.return_value = existing_user
    mock_db_session.execute = AsyncMock(return_value=existing_res)

    payload = {
        "full_name": "New Person",
        "email": "existing@example.com",
        "password": "SuperSecretPassword123!",
        "confirm_password": "SuperSecretPassword123!",
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 409
    assert "already exists" in response.json()["detail"].lower()


def test_signup_password_mismatch_422():
    """Verify password mismatch returns 422 Unprocessable Entity."""
    payload = {
        "full_name": "Mismatch Tester",
        "email": "mismatch@example.com",
        "password": "Password123!",
        "confirm_password": "DifferentPassword123!",
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 422
    assert "passwords do not match" in response.text.lower()


def test_signup_password_too_short_422():
    """Verify password shorter than 8 characters returns 422."""
    payload = {
        "full_name": "Short Pwd",
        "email": "short@example.com",
        "password": "short",
        "confirm_password": "short",
    }
    response = client.post("/api/v1/auth/signup", json=payload)
    assert response.status_code == 422


def test_login_success(mock_db_session):
    """Verify login with correct credentials returns 200, user data, and session cookie."""
    user = UserModel(
        id="usr-login-1",
        email="login@example.com",
        full_name="Login Success",
        hashed_password=hash_password("ValidPassword123!"),
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = user
    mock_db_session.execute = AsyncMock(return_value=user_res)

    payload = {
        "email": "login@example.com",
        "password": "ValidPassword123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["user"]["email"] == "login@example.com"
    assert data["token_type"] == "bearer"
    assert "session_token" in data
    assert "session_token" in response.cookies


def test_login_invalid_password_401(mock_db_session):
    """Verify invalid password returns 401 Unauthorized with safe message."""
    user = UserModel(
        id="usr-login-2",
        email="wrongpass@example.com",
        full_name="Wrong Pass User",
        hashed_password=hash_password("CorrectPassword123!"),
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = user
    mock_db_session.execute = AsyncMock(return_value=user_res)

    payload = {
        "email": "wrongpass@example.com",
        "password": "IncorrectPassword999!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert "invalid email or password" in response.json()["detail"].lower()


def test_login_nonexistent_user_401(mock_db_session):
    """Verify nonexistent email returns 401 Unauthorized with same generic message."""
    user_res = MagicMock()
    user_res.scalar_one_or_none.return_value = None
    mock_db_session.execute = AsyncMock(return_value=user_res)

    payload = {
        "email": "nonexistent@example.com",
        "password": "SomePassword123!",
    }
    response = client.post("/api/v1/auth/login", json=payload)
    assert response.status_code == 401
    assert "invalid email or password" in response.json()["detail"].lower()


def test_get_me_authenticated_bearer(mock_db_session):
    """Verify GET /api/v1/auth/me resolves user from Bearer authorization header."""
    user = UserModel(
        id="usr-me-1",
        email="me@example.com",
        full_name="Me User",
        hashed_password="hash",
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session = UserSessionModel(
        id="sess-1",
        user_id="usr-me-1",
        token_hash=hash_token("sample-token"),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        created_at=datetime.now(timezone.utc),
    )
    session.user = user

    sess_res = MagicMock()
    sess_res.scalar_one_or_none.return_value = session
    mock_db_session.execute = AsyncMock(return_value=sess_res)

    headers = {"Authorization": "Bearer sample-token"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
    assert response.json()["email"] == "me@example.com"
    assert response.json()["full_name"] == "Me User"


def test_get_me_unauthenticated_401():
    """Verify GET /api/v1/auth/me without token returns 401 Unauthorized."""
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401
    assert "authentication required" in response.json()["detail"].lower()


def test_logout_revokes_session(mock_db_session):
    """Verify POST /api/v1/auth/logout deletes DB session and clears cookie."""
    mock_db_session.execute = AsyncMock()

    headers = {"Authorization": "Bearer sample-logout-token"}
    response = client.post("/api/v1/auth/logout", headers=headers)
    assert response.status_code == 200
    assert "logged out" in response.json()["message"].lower()
    # Check that cookie is invalidated / expired
    cookie_header = response.headers.get("set-cookie", "")
    assert "session_token" in cookie_header


def test_forgot_password_generic_response(mock_db_session):
    """Verify forgot-password returns generic 200 OK whether account exists or not."""
    # When user is not found:
    not_found_res = MagicMock()
    not_found_res.scalar_one_or_none.return_value = None
    mock_db_session.execute = AsyncMock(return_value=not_found_res)

    payload = {"email": "any-email@example.com"}
    response = client.post("/api/v1/auth/forgot-password", json=payload)
    assert response.status_code == 200
    assert "password reset instructions" in response.json()["message"].lower()


def test_reset_password_success(mock_db_session):
    """Verify reset password successfully updates password and revokes existing sessions."""
    user = UserModel(
        id="usr-reset-target",
        email="reset@example.com",
        full_name="Reset User",
        hashed_password=hash_password("OldPassword123!"),
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    raw_token = "valid-reset-token"
    token_record = PasswordResetTokenModel(
        id="prt-1",
        user_id="usr-reset-target",
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
        is_used=False,
        created_at=datetime.now(timezone.utc),
    )

    t_res = MagicMock()
    t_res.scalar_one_or_none.return_value = token_record
    u_res = MagicMock()
    u_res.scalar_one_or_none.return_value = user

    # First execute for token lookup, second for user lookup, third for session revocation
    mock_db_session.execute = AsyncMock(side_effect=[t_res, u_res, MagicMock()])

    payload = {
        "token": raw_token,
        "new_password": "NewSecretPassword123!",
        "confirm_new_password": "NewSecretPassword123!",
    }
    response = client.post("/api/v1/auth/reset-password", json=payload)
    assert response.status_code == 200
    assert "password has been successfully reset" in response.json()["message"].lower()
    assert token_record.is_used is True


def test_cross_user_isolation_user_a_cannot_access_user_b_interview(mock_db_session):
    """Verify User B cannot access User A's interview session, answers, or reports (403 Forbidden)."""
    user_b = UserModel(
        id="usr-user-b",
        email="user_b@example.com",
        full_name="User B",
        hashed_password="hash",
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )

    session_a = InterviewSessionModel(
        id="mock-user-a-sess",
        user_id="usr-user-a",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )

    # Mock user B session token
    sess_b = UserSessionModel(
        id="sess-b-1",
        user_id="usr-user-b",
        token_hash=hash_token("token-user-b"),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        created_at=datetime.now(timezone.utc),
    )
    sess_b.user = user_b

    # When User B requests User A's session:
    # 1st query: session token lookup for auth (returns sess_b)
    # 2nd query: interview session lookup (returns session_a)
    user_auth_res = MagicMock()
    user_auth_res.scalar_one_or_none.return_value = sess_b

    interview_res = MagicMock()
    interview_res.scalar_one_or_none.return_value = session_a

    mock_db_session.execute = AsyncMock(side_effect=[user_auth_res, interview_res])

    headers = {"Authorization": "Bearer token-user-b"}
    response = client.get("/api/v1/interviews/mock-user-a-sess", headers=headers)
    assert response.status_code == 403
    assert "Forbidden" in response.json()["detail"]


def test_unauthenticated_access_to_user_session_returns_401(mock_db_session):
    """Verify unauthenticated user cannot access a user-owned interview session (401 Unauthorized)."""
    session_a = InterviewSessionModel(
        id="mock-user-a-sess2",
        user_id="usr-user-a",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )

    interview_res = MagicMock()
    interview_res.scalar_one_or_none.return_value = session_a
    mock_db_session.execute = AsyncMock(return_value=interview_res)

    response = client.get("/api/v1/interviews/mock-user-a-sess2")
    assert response.status_code == 401
    assert "Authentication required" in response.json()["detail"]


def test_user_can_access_own_interview(mock_db_session):
    """Verify User A can successfully access their own interview session."""
    user_a = UserModel(
        id="usr-user-a",
        email="user_a@example.com",
        full_name="User A",
        hashed_password="hash",
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    session_a = InterviewSessionModel(
        id="mock-user-a-sess3",
        user_id="usr-user-a",
        role="Backend Engineer",
        difficulty="Senior",
        primary_language="Python",
        question_count=5,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )
    sess_a = UserSessionModel(
        id="sess-a-1",
        user_id="usr-user-a",
        token_hash=hash_token("token-user-a"),
        expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        created_at=datetime.now(timezone.utc),
    )
    sess_a.user = user_a

    user_auth_res = MagicMock()
    user_auth_res.scalar_one_or_none.return_value = sess_a

    interview_res = MagicMock()
    interview_res.scalar_one_or_none.return_value = session_a

    mock_db_session.execute = AsyncMock(side_effect=[user_auth_res, interview_res])

    headers = {"Authorization": "Bearer token-user-a"}
    response = client.get("/api/v1/interviews/mock-user-a-sess3", headers=headers)
    assert response.status_code == 200
    assert response.json()["session_id"] == "mock-user-a-sess3"
    assert response.json()["user_id"] == "usr-user-a"


def test_guest_session_backward_compatibility(mock_db_session):
    """Verify guest sessions (user_id=None) remain accessible without authentication."""
    guest_session = InterviewSessionModel(
        id="mock-guest-sess",
        user_id=None,
        role="Frontend Engineer",
        difficulty="Mid",
        primary_language="Python",
        question_count=3,
        status="in_progress",
        created_at=datetime.now(timezone.utc),
    )

    interview_res = MagicMock()
    interview_res.scalar_one_or_none.return_value = guest_session
    mock_db_session.execute = AsyncMock(return_value=interview_res)

    response = client.get("/api/v1/interviews/mock-guest-sess")
    assert response.status_code == 200
    assert response.json()["session_id"] == "mock-guest-sess"
    assert response.json()["user_id"] is None
