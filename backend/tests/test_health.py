from fastapi.testclient import TestClient
from app.main import app
from app.core.config import settings
import app.db.session as db_session

client = TestClient(app)


def test_health_check_returns_ok():
    response = client.get("/api/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"
    assert "app" in payload
    assert "version" in payload


def test_cors_header_for_vite_dev_server():
    response = client.get("/api/health", headers={"Origin": "http://localhost:5173"})
    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == "http://localhost:5173"


def test_db_health_check_unconfigured():
    # Save original setting
    original_url = settings.DATABASE_URL
    original_engine = db_session._engine
    try:
        settings.DATABASE_URL = None
        db_session._engine = None

        response = client.get("/api/health/db")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "unconfigured"
        assert data["connected"] is False
        assert "database" in data
    finally:
        settings.DATABASE_URL = original_url
        db_session._engine = original_engine


def test_db_health_check_safe_error_no_secret_exposure():
    # Verify that even with connection failure, passwords or sensitive URLs are never leaked in the response
    original_url = settings.DATABASE_URL
    original_engine = db_session._engine
    fake_secret = "super_secret_password_xyz_999"
    try:
        settings.DATABASE_URL = f"postgresql+asyncpg://postgres:{fake_secret}@127.0.0.1:59999/mock_interviewer"
        db_session._engine = None

        response = client.get("/api/health/db")
        assert response.status_code == 200
        data = response.json()
        assert data["connected"] is False
        assert data["status"] == "error"
        # Crucial security assertion: password must NEVER be in response message or body
        assert fake_secret not in response.text
        assert fake_secret not in data["message"]
    finally:
        settings.DATABASE_URL = original_url
        db_session._engine = original_engine
