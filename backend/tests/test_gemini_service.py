import json
import pytest
import httpx
from unittest.mock import AsyncMock

from app.core.config import settings
from app.schemas.interview import (
    CodingLanguage,
    InterviewQuestionSchema,
    SeniorityLevel,
)
from app.services.gemini_service import (
    GeminiProviderError,
    GeminiQuotaExceededError,
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
    """When a network error occurs and allow_offline is False, raise GeminiProviderError."""
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
            allow_offline=False,
        )

    assert "Network connectivity error" in str(exc_info.value)


@pytest.mark.anyio
async def test_generate_interview_question_network_error_falls_back_when_offline_allowed(monkeypatch):
    """When a network error occurs and allow_offline is True, safely fall back to offline catalog."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy-key")

    async def mock_post(url, headers=None, json=None):
        raise httpx.ConnectTimeout("Connection timed out after 30s")

    mock_client = httpx.AsyncClient()
    monkeypatch.setattr(mock_client, "post", mock_post)

    question = await generate_interview_question(
        role="Distributed Systems Architect",
        difficulty=SeniorityLevel.SENIOR,
        primary_language=CodingLanguage.PYTHON,
        question_number=2,
        client=mock_client,
        allow_offline=True,
    )

    assert isinstance(question, InterviewQuestionSchema)
    assert question.question_number == 2
    assert question.difficulty == SeniorityLevel.SENIOR
    assert "Stream Ingestion" in question.topic


@pytest.mark.anyio
@pytest.mark.parametrize("status_code", [502, 503, 504])
async def test_generate_interview_question_502_503_504_falls_back_when_offline_allowed(monkeypatch, status_code):
    """When Gemini returns transient 502/503/504 and allow_offline is True, safely fall back to offline catalog."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy-key")

    error_body = json.dumps({
        "error": {
            "code": status_code,
            "message": "The model is currently experiencing high demand. Please try again later.",
            "status": "UNAVAILABLE",
        }
    }).encode("utf-8")

    async def mock_post(url, headers=None, json=None):
        return httpx.Response(status_code, content=error_body, request=httpx.Request("POST", url))

    mock_client = httpx.AsyncClient()
    monkeypatch.setattr(mock_client, "post", mock_post)

    question = await generate_interview_question(
        role="Core Java Engineer",
        difficulty=SeniorityLevel.MID,
        primary_language=CodingLanguage.JAVA,
        question_number=1,
        client=mock_client,
        allow_offline=True,
    )

    assert isinstance(question, InterviewQuestionSchema)
    assert question.question_number == 1
    assert question.difficulty == SeniorityLevel.MID
    assert "Thread Safety" in question.topic
    assert "DistributedRateLimiter" in question.starter_code


@pytest.mark.anyio
@pytest.mark.parametrize("status_code", [502, 503, 504])
async def test_generate_interview_question_502_503_504_raises_provider_error_when_offline_disabled(monkeypatch, status_code):
    """When Gemini returns transient 502/503/504 and allow_offline is False, raise GeminiProviderError."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy-key")

    async def mock_post(url, headers=None, json=None):
        return httpx.Response(status_code, text="Service Unavailable", request=httpx.Request("POST", url))

    mock_client = httpx.AsyncClient()
    monkeypatch.setattr(mock_client, "post", mock_post)

    with pytest.raises(GeminiProviderError) as exc_info:
        await generate_interview_question(
            role="Core Java Engineer",
            difficulty=SeniorityLevel.MID,
            primary_language=CodingLanguage.JAVA,
            question_number=1,
            client=mock_client,
            allow_offline=False,
        )

    assert f"HTTP {status_code}" in str(exc_info.value)


@pytest.mark.anyio
@pytest.mark.parametrize("status_code", [400, 401, 403, 404])
async def test_generate_interview_question_permanent_4xx_does_not_fall_back(monkeypatch, status_code):
    """Permanent client errors (400, 401, 403, 404) must raise GeminiProviderError and NEVER fall back, even when allow_offline is True."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy-key")

    async def mock_post(url, headers=None, json=None):
        return httpx.Response(status_code, text=f"Client Error {status_code}", request=httpx.Request("POST", url))

    mock_client = httpx.AsyncClient()
    monkeypatch.setattr(mock_client, "post", mock_post)

    with pytest.raises(GeminiProviderError) as exc_info:
        await generate_interview_question(
            role="Data Engineer",
            difficulty=SeniorityLevel.STAFF,
            primary_language=CodingLanguage.SQL,
            question_number=1,
            client=mock_client,
            allow_offline=True,  # Even with allow_offline=True, permanent client errors must not fall back
        )

    assert f"HTTP {status_code}" in str(exc_info.value)


def test_offline_mock_question_unsupported_language_raises_provider_error():
    """Verify that requesting an offline question for an unsupported language or empty catalog raises GeminiProviderError."""
    with pytest.raises(GeminiProviderError) as exc_info:
        generate_offline_mock_question(
            role="Systems Engineer",
            difficulty=SeniorityLevel.SENIOR,
            primary_language="Rust",  # Not in CodingLanguage enum
            question_number=1,
        )

    assert "No suitable offline mock question found in catalog" in str(exc_info.value)
    assert "Rust" in str(exc_info.value)


@pytest.mark.anyio
async def test_generate_interview_question_offline_catalog_empty_propagates_error(monkeypatch):
    """When upstream fails with 503 and fallback is triggered, but catalog has no suitable question, propagate GeminiProviderError."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy-key")

    async def mock_post(url, headers=None, json=None):
        return httpx.Response(503, text="Overloaded", request=httpx.Request("POST", url))

    mock_client = httpx.AsyncClient()
    monkeypatch.setattr(mock_client, "post", mock_post)

    with pytest.raises(GeminiProviderError) as exc_info:
        await generate_interview_question(
            role="Rust Developer",
            difficulty=SeniorityLevel.SENIOR,
            primary_language="Rust",  # No catalog exists for Rust
            question_number=1,
            client=mock_client,
            allow_offline=True,
        )

    assert "No suitable offline mock question found in catalog" in str(exc_info.value)


@pytest.mark.anyio
async def test_generate_interview_question_429_exhausted_raises_quota_error(monkeypatch):
    """When Gemini returns 429 across retries, raise GeminiQuotaExceededError with retry_after."""
    import asyncio
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy-key")
    monkeypatch.setattr(asyncio, "sleep", AsyncMock())

    async def mock_post(url, headers=None, json=None):
        return httpx.Response(
            429,
            headers={"Retry-After": "8"},
            content=b'{"error": {"code": 429, "message": "Resource exhausted"}}',
            request=httpx.Request("POST", url),
        )

    mock_client = httpx.AsyncClient()
    monkeypatch.setattr(mock_client, "post", mock_post)

    with pytest.raises(GeminiQuotaExceededError) as exc_info:
        await generate_interview_question(
            role="Backend Engineer",
            difficulty=SeniorityLevel.SENIOR,
            primary_language=CodingLanguage.PYTHON,
            question_number=1,
            client=mock_client,
            allow_offline=False,
        )

    assert exc_info.value.retry_after == 8.0
    assert "rate limit exceeded" in str(exc_info.value).lower()
    assert "429" in str(exc_info.value)


@pytest.mark.anyio
async def test_generate_interview_question_429_exhausted_falls_back_when_offline_allowed(monkeypatch):
    """When GEMINI_API_KEY is configured but Gemini returns 429, fall back to offline catalog if allow_offline=True."""
    import asyncio
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "configured-secret-key")
    monkeypatch.setattr(asyncio, "sleep", AsyncMock())

    async def mock_post(url, headers=None, json=None):
        return httpx.Response(
            429,
            content=b'{"error": {"code": 429, "message": "Resource has been exhausted", "status": "RESOURCE_EXHAUSTED"}}',
            request=httpx.Request("POST", url),
        )

    mock_client = httpx.AsyncClient()
    monkeypatch.setattr(mock_client, "post", mock_post)

    question = await generate_interview_question(
        role="Distributed Systems Engineer",
        difficulty=SeniorityLevel.SENIOR,
        primary_language=CodingLanguage.PYTHON,
        question_number=1,
        client=mock_client,
        allow_offline=True,
    )
    assert isinstance(question, InterviewQuestionSchema)
    assert question.question_number == 1
    assert "Distributed Concurrency" in question.topic


@pytest.mark.anyio
async def test_generate_interview_question_429_transient_retry_success(monkeypatch):
    """When Gemini returns 429 once and then succeeds on retry, return the question."""
    import asyncio
    from unittest.mock import AsyncMock
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "dummy-key")
    monkeypatch.setattr(asyncio, "sleep", AsyncMock())

    valid_payload = {
        "candidates": [
            {
                "content": {
                    "parts": [
                        {
                            "text": json.dumps(
                                {
                                    "question_number": 1,
                                    "topic": "Retry Recovery",
                                    "difficulty": "Senior",
                                    "question_text": "Implement resilient circuit breaker.",
                                    "starter_code": "class CircuitBreaker: pass",
                                    "expected_concepts": ["Failure threshold", "Half-open state"],
                                }
                            )
                        }
                    ]
                }
            }
        ]
    }

    call_count = 0

    async def mock_post(url, headers=None, json=None):
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            return httpx.Response(
                429,
                headers={"Retry-After": "1"},
                content=b'{"error": {"code": 429, "message": "Resource exhausted"}}',
                request=httpx.Request("POST", url),
            )
        return httpx.Response(200, json=valid_payload, request=httpx.Request("POST", url))

    mock_client = httpx.AsyncClient()
    monkeypatch.setattr(mock_client, "post", mock_post)

    q = await generate_interview_question(
        role="Backend Engineer",
        difficulty=SeniorityLevel.SENIOR,
        primary_language=CodingLanguage.PYTHON,
        question_number=1,
        client=mock_client,
    )

    assert call_count == 2
    assert q.topic == "Retry Recovery"
    assert q.question_number == 1


def test_offline_mock_question_multi_question_catalog():
    """Verify offline mock questions rotate topics across question numbers for all languages."""
    for lang in [CodingLanguage.PYTHON, CodingLanguage.JAVA, CodingLanguage.SQL]:
        q1 = generate_offline_mock_question(role="Engineer", difficulty=SeniorityLevel.MID, primary_language=lang, question_number=1)
        q2 = generate_offline_mock_question(role="Engineer", difficulty=SeniorityLevel.MID, primary_language=lang, question_number=2)
        q3 = generate_offline_mock_question(role="Engineer", difficulty=SeniorityLevel.MID, primary_language=lang, question_number=3)
        q4 = generate_offline_mock_question(role="Engineer", difficulty=SeniorityLevel.MID, primary_language=lang, question_number=4)

        # Questions should have distinct topics in 1..3
        assert q1.topic != q2.topic
        assert q2.topic != q3.topic
        assert q1.topic != q3.topic

        # Question numbers preserved
        assert q1.question_number == 1
        assert q2.question_number == 2
        assert q3.question_number == 3
        assert q4.question_number == 4

        # Wrap around catalog preserves topic pattern
        assert q4.topic == q1.topic
