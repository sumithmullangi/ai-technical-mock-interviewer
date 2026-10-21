import json
import pytest
import httpx

from app.core.config import settings
from app.schemas.interview import (
    CodingLanguage,
    InterviewQuestionSchema,
    SeniorityLevel,
)
from app.services.gemini_service import (
    GeminiProviderError,
    GeminiValidationError,
    generate_interview_question,
    generate_offline_mock_question,
)


def test_offline_mock_question_python_structure():
    """Verify deterministic offline question for Python role."""
    q = generate_offline_mock_question(
        role="Distributed Systems Engineer",
        difficulty=SeniorityLevel.SENIOR,
        primary_language=CodingLanguage.PYTHON,
        question_number=1,
    )
    assert isinstance(q, InterviewQuestionSchema)
    assert q.question_number == 1
    assert q.difficulty == SeniorityLevel.SENIOR
    assert "Distributed Concurrency" in q.topic
    assert "idempotent payment" in q.question_text.lower()
    assert "class PaymentProcessor" in q.starter_code
    assert len(q.expected_concepts) >= 3


def test_offline_mock_question_sql_structure():
    """Verify deterministic offline question for SQL / Data role."""
    q = generate_offline_mock_question(
        role="Data Platform Engineer",
        difficulty=SeniorityLevel.STAFF,
        primary_language=CodingLanguage.SQL,
        question_number=2,
    )
    assert isinstance(q, InterviewQuestionSchema)
    assert q.question_number == 2
    assert q.difficulty == SeniorityLevel.STAFF
    assert "Window Functions" in q.topic
    assert "SELECT" in q.starter_code
    assert "PostgreSQL" in q.question_text


def test_offline_mock_question_java_structure():
    """Verify deterministic offline question for Java role."""
    q = generate_offline_mock_question(
        role="Backend Core Engineer",
        difficulty=SeniorityLevel.MID,
        primary_language=CodingLanguage.JAVA,
        question_number=3,
    )
    assert isinstance(q, InterviewQuestionSchema)
    assert q.question_number == 3
    assert q.difficulty == SeniorityLevel.MID
    assert "Java Memory Model" in q.topic
    assert "public class DistributedRateLimiter" in q.starter_code


@pytest.mark.anyio
async def test_generate_interview_question_offline_when_key_unset(monkeypatch):
    """When GEMINI_API_KEY is None or empty, returns deterministic offline question without network."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)

    question = await generate_interview_question(
        role="Cloud Infrastructure Engineer",
        difficulty=SeniorityLevel.SENIOR,
        primary_language=CodingLanguage.PYTHON,
        question_number=1,
    )
    assert isinstance(question, InterviewQuestionSchema)
    assert question.question_number == 1
    assert question.difficulty == SeniorityLevel.SENIOR


@pytest.mark.anyio
async def test_generate_interview_question_success_with_mocked_http(monkeypatch):
    """When GEMINI_API_KEY is configured, sends structured request and parses valid JSON response."""
    test_key = "dummy-secret-gemini-key-12345"
    monkeypatch.setattr(settings, "GEMINI_API_KEY", test_key)

    mock_gemini_payload = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps(
                                {
                                    "question_number": 1,
                                    "topic": "Distributed Consensus & Raft",
                                    "difficulty": "Senior",
                                    "question_text": "Design a leader election algorithm handling network split-brains.",
                                    "starter_code": "class RaftNode:\n    pass",
                                    "expected_concepts": ["Quorum", "Heartbeats", "Split-brain"],
                                }
                            )
                        }
                    ]
                }
            }
        ]
    }

    async def mock_post(url, headers=None, json=None):
        assert headers.get("x-goog-api-key") == test_key
        return httpx.Response(200, json=mock_gemini_payload, request=httpx.Request("POST", url))

    mock_client = httpx.AsyncClient()
    monkeypatch.setattr(mock_client, "post", mock_post)

    question = await generate_interview_question(
        role="Backend Engineer",
        difficulty=SeniorityLevel.SENIOR,
        primary_language=CodingLanguage.PYTHON,
        question_number=1,
        client=mock_client,
    )

    assert isinstance(question, InterviewQuestionSchema)
    assert question.topic == "Distributed Consensus & Raft"
    assert question.difficulty == SeniorityLevel.SENIOR
    assert "Split-brain" in question.expected_concepts


@pytest.mark.anyio
async def test_generate_interview_question_api_error_does_not_silently_fallback(monkeypatch):
    """When a real API call fails, raise GeminiProviderError without falling back to mock or leaking key."""
    test_key = "super_secret_gemini_key_9999"
    monkeypatch.setattr(settings, "GEMINI_API_KEY", test_key)

    async def mock_post(url, headers=None, json=None):
        # Simulate Google API 403 Invalid API Key error
        return httpx.Response(
            403,
            text=f"API_KEY_INVALID: Key {test_key} is not authorized.",
            request=httpx.Request("POST", url),
        )

    mock_client = httpx.AsyncClient()
    monkeypatch.setattr(mock_client, "post", mock_post)

    with pytest.raises(GeminiProviderError) as exc_info:
        await generate_interview_question(
            role="Backend Engineer",
            difficulty=SeniorityLevel.SENIOR,
            primary_language=CodingLanguage.PYTHON,
            question_number=1,
            client=mock_client,
        )

    err_msg = str(exc_info.value)
    assert "HTTP 403" in err_msg
    # Crucial security guarantee: Secret key must never leak into exception message
    assert test_key not in err_msg
    assert "<REDACTED>" in err_msg


@pytest.mark.anyio
async def test_generate_interview_question_malformed_json_raises_validation_error(monkeypatch):
    """When Gemini returns invalid JSON, raise GeminiValidationError."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy-key")

    mock_gemini_payload = {
        "candidates": [
            {
                "content": {
                    "parts": [{"text": "This is raw text, NOT valid JSON {{"}]
                }
            }
        ]
    }

    async def mock_post(url, headers=None, json=None):
        return httpx.Response(200, json=mock_gemini_payload, request=httpx.Request("POST", url))

    mock_client = httpx.AsyncClient()
    monkeypatch.setattr(mock_client, "post", mock_post)

    with pytest.raises(GeminiValidationError) as exc_info:
        await generate_interview_question(
            role="Backend Engineer",
            difficulty=SeniorityLevel.SENIOR,
            primary_language=CodingLanguage.PYTHON,
            question_number=1,
            client=mock_client,
        )

    assert "valid JSON" in str(exc_info.value)


@pytest.mark.anyio
async def test_generate_interview_question_missing_fields_raises_validation_error(monkeypatch):
    """When Gemini returns JSON missing required schema fields, raise GeminiValidationError."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy-key")

    mock_gemini_payload = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps(
                                {
                                    "question_number": 1,
                                    "topic": "Distributed Systems",
                                    # Missing question_text, difficulty, etc.
                                }
                            )
                        }
                    ]
                }
            }
        ]
    }

    async def mock_post(url, headers=None, json=None):
        return httpx.Response(200, json=mock_gemini_payload, request=httpx.Request("POST", url))

    mock_client = httpx.AsyncClient()
    monkeypatch.setattr(mock_client, "post", mock_post)

    with pytest.raises(GeminiValidationError) as exc_info:
        await generate_interview_question(
            role="Backend Engineer",
            difficulty=SeniorityLevel.SENIOR,
            primary_language=CodingLanguage.PYTHON,
            question_number=1,
            client=mock_client,
        )

    assert "Pydantic schema validation" in str(exc_info.value)


@pytest.mark.anyio
async def test_generate_interview_question_network_error(monkeypatch):
    """When a network error occurs, raise GeminiProviderError."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy-key")

    async def mock_post(url, headers=None, json=None):
        raise httpx.ConnectTimeout("Connection timed out after 30s")

    mock_client = httpx.AsyncClient()
    monkeypatch.setattr(mock_client, "post", mock_post)

    with pytest.raises(GeminiProviderError) as exc_info:
        await generate_interview_question(
            role="Backend Engineer",
            difficulty=SeniorityLevel.SENIOR,
            primary_language=CodingLanguage.PYTHON,
            question_number=1,
            client=mock_client,
        )

    assert "Network connectivity error" in str(exc_info.value)
