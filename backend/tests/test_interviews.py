from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_configure_interview_success_default():
    payload = {
        "role": "Backend Engineer (Distributed Systems)",
        "difficulty": "Senior",
        "primaryLanguage": "Python",
        "questionCount": 5,
    }
    response = client.post("/api/v1/interviews/config", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "configured"
    assert data["session_id"].startswith("mock-")
    assert data["config"]["role"] == "Backend Engineer (Distributed Systems)"
    assert data["config"]["difficulty"] == "Senior"
    assert data["config"]["primaryLanguage"] == "Python"
    assert data["config"]["questionCount"] == 5


def test_configure_interview_success_custom_bounds():
    # Lower bound (3 questions)
    payload_min = {
        "role": "Data Engineer",
        "difficulty": "Junior",
        "primary_language": "SQL",
        "question_count": 3,
    }
    res_min = client.post("/api/v1/interviews/config", json=payload_min)
    assert res_min.status_code == 200
    assert res_min.json()["config"]["questionCount"] == 3

    # Upper bound (10 questions)
    payload_max = {
        "role": "Staff Systems Architect",
        "difficulty": "Staff",
        "primary_language": "Java",
        "question_count": 10,
    }
    res_max = client.post("/api/v1/interviews/config", json=payload_max)
    assert res_max.status_code == 200
    assert res_max.json()["config"]["questionCount"] == 10


def test_configure_interview_invalid_question_count_below_min():
    payload = {
        "role": "Backend Engineer",
        "difficulty": "Mid",
        "primaryLanguage": "Python",
        "questionCount": 2,  # Invalid: min is 3
    }
    response = client.post("/api/v1/interviews/config", json=payload)
    assert response.status_code == 422


def test_configure_interview_invalid_question_count_above_max():
    payload = {
        "role": "Backend Engineer",
        "difficulty": "Mid",
        "primaryLanguage": "Python",
        "questionCount": 11,  # Invalid: max is 10
    }
    response = client.post("/api/v1/interviews/config", json=payload)
    assert response.status_code == 422


def test_configure_interview_invalid_seniority():
    payload = {
        "role": "Backend Engineer",
        "difficulty": "Lead",  # Invalid: only Junior, Mid, Senior, Staff
        "primaryLanguage": "Python",
        "questionCount": 5,
    }
    response = client.post("/api/v1/interviews/config", json=payload)
    assert response.status_code == 422


def test_configure_interview_invalid_language():
    payload = {
        "role": "Backend Engineer",
        "difficulty": "Senior",
        "primaryLanguage": "Rust",  # Invalid: only Python, Java, SQL
        "questionCount": 5,
    }
    response = client.post("/api/v1/interviews/config", json=payload)
    assert response.status_code == 422


def test_configure_interview_invalid_empty_role():
    payload = {
        "role": "",  # Invalid: min_length is 2
        "difficulty": "Senior",
        "primaryLanguage": "Python",
        "questionCount": 5,
    }
    response = client.post("/api/v1/interviews/config", json=payload)
    assert response.status_code == 422


def test_configure_interview_alias_endpoint():
    payload = {
        "role": "Full-Stack Engineer",
        "difficulty": "Mid",
        "primaryLanguage": "Java",
        "questionCount": 5,
    }
    response = client.post("/api/interviews/config", json=payload)
    assert response.status_code == 200
    assert response.json()["status"] == "configured"


def test_configure_interview_user_aliases():
    payload = {
        "role": "Systems Infrastructure & Reliability",
        "seniority": "Junior",
        "coding_language": "Python",
        "question_count": 8,
    }
    response = client.post("/api/v1/interviews/config", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "configured"
    assert data["config"]["role"] == "Systems Infrastructure & Reliability"
    assert data["config"]["difficulty"] == "Junior"
    assert data["config"]["primary_language"] == "Python"
    assert data["config"]["question_count"] == 8

