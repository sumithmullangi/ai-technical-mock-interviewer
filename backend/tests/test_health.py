from fastapi.testclient import TestClient
from app.main import app

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
