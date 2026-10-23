"""Deterministic regression and unit tests for OpenRouter secondary fallback AI provider.

Verifies:
- Question generation routing to OpenRouter when Gemini encounters HTTP 429 quota exhaustion.
- Question generation routing to OpenRouter when Gemini API key is unconfigured.
- Answer evaluation routing to OpenRouter when Gemini fails.
- Authoritative 4D rubric scoring calculation (40% correctness, 25% depth, 20% edge cases, 15% communication).
- Honest failure propagation when both Gemini and OpenRouter fail (NEVER fabricate scores).
- Adaptive follow-up question synthesis via OpenRouter fallback.
- Conversational voice interviewer replies via OpenRouter fallback.
- Executive report narrative synthesis via OpenRouter fallback.
- Markdown code block fence stripping for open-weights models (e.g. nvidia/nemotron-3-ultra-550b-a55b:free).
- Security: OPENROUTER_API_KEY is masked and never exposed in repr(settings).
"""
import json
from unittest.mock import AsyncMock, MagicMock, patch
import httpx
import pytest

from app.core.config import Settings, settings
from app.schemas.interview import (
    CodingLanguage,
    FollowUpQuestionOutput,
    GeminiEvaluationOutput,
    GeminiReportNarrativeOutput,
    InterviewQuestionSchema,
    SeniorityLevel,
)
from app.services.gemini_service import (
    GeminiProviderError,
    GeminiQuotaExceededError,
    evaluate_candidate_answer,
    generate_follow_up_question,
    generate_interview_question,
    generate_report_narrative,
)
from app.services.voice_service import generate_voice_conversational_reply
from app.services.openrouter_service import (
    _clean_json_text,
    evaluate_openrouter_answer,
    generate_openrouter_question,
)


# ==============================================================================
# 1. Security & Configuration Tests
# ==============================================================================

def test_openrouter_api_key_masked_in_repr():
    """Verify OPENROUTER_API_KEY is masked in repr(settings) to prevent log leakage."""
    test_key = "sk-or-v1-my-secret-openrouter-key-12345"
    s = Settings(
        ENVIRONMENT="development",
        OPENROUTER_API_KEY=test_key,
    )
    rendered = repr(s)
    assert test_key not in rendered


def test_markdown_fence_cleaning_utility():
    """Verify markdown fences (```json ... ```) commonly returned by open-weights models are stripped."""
    raw = "```json\n{\"question_number\": 1, \"topic\": \"Distributed Systems\"}\n```"
    cleaned = _clean_json_text(raw)
    assert cleaned == "{\"question_number\": 1, \"topic\": \"Distributed Systems\"}"


# ==============================================================================
# 2. Question Generation Fallback Tests
# ==============================================================================

@pytest.mark.anyio
async def test_question_generation_openrouter_fallback_when_gemini_quota_exhausted(monkeypatch):
    """When Gemini returns 429 quota exhausted, safely fall back to OpenRouter."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-gemini-key")
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "mock-openrouter-key")
    monkeypatch.setattr(settings, "OPENROUTER_MODEL", "nvidia/nemotron-3-ultra-550b-a55b:free")

    # Mock Gemini 429 response
    gemini_resp = MagicMock()
    gemini_resp.status_code = 429
    gemini_resp.text = "You exceeded your current quota, please check your plan and billing details."
    gemini_resp.json.return_value = {
        "error": {
            "code": 429,
            "message": "Resource has been exhausted (e.g. check quota).",
            "status": "RESOURCE_EXHAUSTED",
        }
    }

    # Mock OpenRouter 200 response
    or_question_data = {
        "question_number": 1,
        "topic": "Distributed Consensus & Raft",
        "difficulty": "Senior",
        "question_text": "Design a fault-tolerant state machine replication engine using Raft.",
        "starter_code": "class RaftNode:\n    def __init__(self, node_id: str):\n        pass",
        "expected_concepts": ["Leader Election", "Log Replication", "Safety Invariant"],
    }
    or_resp = MagicMock()
    or_resp.status_code = 200
    or_resp.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": json.dumps(or_question_data)
                }
            }
        ]
    }

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    # First post (Gemini) returns 429; second post (OpenRouter) returns 200
    mock_client.post = AsyncMock(side_effect=[gemini_resp, or_resp])

    question = await generate_interview_question(
        role="Backend Engineer",
        difficulty=SeniorityLevel.SENIOR,
        primary_language=CodingLanguage.PYTHON,
        question_number=1,
        client=mock_client,
    )

    assert isinstance(question, InterviewQuestionSchema)
    assert question.topic == "Distributed Consensus & Raft"
    assert question.question_number == 1
    assert "Leader Election" in question.expected_concepts


@pytest.mark.anyio
async def test_question_generation_openrouter_fallback_when_gemini_unconfigured(monkeypatch):
    """When GEMINI_API_KEY is not set, question generation routes directly to OpenRouter."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "mock-openrouter-key")

    or_question_data = {
        "question_number": 2,
        "topic": "Event-Driven Message Queues",
        "difficulty": "Senior",
        "question_text": "Implement an at-least-once message processing pipeline with idempotent keys.",
        "starter_code": None,
        "expected_concepts": ["Idempotency", "Consumer Offsets", "Dead Letter Queue"],
    }
    or_resp = MagicMock()
    or_resp.status_code = 200
    or_resp.json.return_value = {
        "choices": [{"message": {"content": json.dumps(or_question_data)}}]
    }

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.post = AsyncMock(return_value=or_resp)

    question = await generate_interview_question(
        role="Backend Engineer",
        difficulty=SeniorityLevel.SENIOR,
        primary_language=CodingLanguage.PYTHON,
        question_number=2,
        client=mock_client,
        allow_offline=False,
    )

    assert question.topic == "Event-Driven Message Queues"
    assert question.question_number == 2


# ==============================================================================
# 3. Answer Evaluation Fallback & Integrity Tests
# ==============================================================================

@pytest.mark.anyio
async def test_answer_evaluation_openrouter_fallback_when_gemini_429(monkeypatch):
    """When Gemini returns 429 during evaluation, OpenRouter scores answer and verifies rubric weighting."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-gemini-key")
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "mock-openrouter-key")

    gemini_resp = MagicMock()
    gemini_resp.status_code = 429
    gemini_resp.text = "daily quota exceeded"
    gemini_resp.json.return_value = {"error": {"code": 429, "message": "quota exceeded"}}

    # OpenRouter returns 4D rubric component scores
    # Expected overall: 8.5*0.40 + 7.0*0.25 + 6.5*0.20 + 9.0*0.15 = 3.4 + 1.75 + 1.30 + 1.35 = 7.80
    or_eval_data = {
        "correctness": 8.5,
        "technical_depth": 7.0,
        "edge_cases": 6.5,
        "communication": 9.0,
        "feedback": "Strong architectural foundation with good modular breakdown.",
        "strengths": ["Token bucket algorithm", "Redis Lua script atomicity"],
        "missing_concepts": ["Clock drift across distributed nodes"],
        "suggestions": ["Account for monotonic clock skew in distributed limiters"],
    }
    or_resp = MagicMock()
    or_resp.status_code = 200
    or_resp.json.return_value = {
        "choices": [{"message": {"content": f"```json\n{json.dumps(or_eval_data)}\n```"}}]
    }

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.post = AsyncMock(side_effect=[gemini_resp, or_resp])

    eval_out, overall_score = await evaluate_candidate_answer(
        role="Backend Engineer",
        difficulty=SeniorityLevel.SENIOR,
        primary_language=CodingLanguage.PYTHON,
        question_text="Design a distributed rate limiter.",
        expected_concepts=["Token Bucket", "Redis", "Atomicity"],
        answer_text="I use Redis token bucket with Lua scripts for atomic increments.",
        client=mock_client,
    )

    assert isinstance(eval_out, GeminiEvaluationOutput)
    assert eval_out.correctness == 8.5
    assert eval_out.technical_depth == 7.0
    assert eval_out.edge_cases == 6.5
    assert eval_out.communication == 9.0
    # Verified exact rubric formula: 40% + 25% + 20% + 15% = 7.80
    assert overall_score == 7.80
    assert "Token bucket algorithm" in eval_out.strengths


@pytest.mark.anyio
async def test_answer_evaluation_honest_failure_when_both_fail(monkeypatch):
    """When both Gemini and OpenRouter fail, never fabricate scores: raise GeminiQuotaExceededError."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-gemini-key")
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "mock-openrouter-key")

    gemini_resp = MagicMock()
    gemini_resp.status_code = 429
    gemini_resp.text = "daily quota exceeded"
    gemini_resp.json.return_value = {"error": {"code": 429, "message": "quota exceeded"}}

    or_resp = MagicMock()
    or_resp.status_code = 429
    or_resp.text = "OpenRouter free credits exhausted"

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.post = AsyncMock(side_effect=[gemini_resp, or_resp])

    with pytest.raises(GeminiQuotaExceededError) as exc_info:
        await evaluate_candidate_answer(
            role="Backend Engineer",
            difficulty=SeniorityLevel.SENIOR,
            primary_language=CodingLanguage.PYTHON,
            question_text="Explain database sharding.",
            expected_concepts=["Consistent Hashing"],
            answer_text="Sharding partitions rows across nodes.",
            client=mock_client,
        )

    assert "rate limit exceeded" in str(exc_info.value).lower()


# ==============================================================================
# 4. Follow-Up Question Fallback Tests
# ==============================================================================

@pytest.mark.anyio
async def test_follow_up_generation_openrouter_fallback(monkeypatch):
    """Verify follow-up question synthesis routes to OpenRouter when Gemini fails."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "mock-gemini-key")
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "mock-openrouter-key")

    gemini_resp = MagicMock()
    gemini_resp.status_code = 429
    gemini_resp.text = "daily quota exceeded"
    gemini_resp.json.return_value = {"error": {"code": 429, "message": "quota exceeded"}}

    fu_data = {
        "question_text": "How do you handle split-brain scenarios when network partitions occur?",
        "expected_concepts": ["Quorum", "Fencing Tokens", "Leader Demotion"],
        "probing_reason": "Candidate omitted network partition handling in prior explanation.",
    }
    or_resp = MagicMock()
    or_resp.status_code = 200
    or_resp.json.return_value = {
        "choices": [{"message": {"content": json.dumps(fu_data)}}]
    }

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.post = AsyncMock(side_effect=[gemini_resp, or_resp])

    fu = await generate_follow_up_question(
        role="Backend Engineer",
        difficulty=SeniorityLevel.SENIOR,
        primary_language=CodingLanguage.PYTHON,
        primary_question_number=1,
        primary_question_text="Design distributed consensus.",
        follow_up_number=1,
        candidate_answer_text="Nodes elect a leader by voting.",
        client=mock_client,
    )

    assert isinstance(fu, FollowUpQuestionOutput)
    assert "split-brain" in fu.question_text
    assert "Quorum" in fu.expected_concepts


# ==============================================================================
# 5. Voice Conversational Reply Fallback Tests
# ==============================================================================

@pytest.mark.anyio
async def test_voice_conversational_reply_openrouter_fallback(monkeypatch):
    """Verify spoken interviewer reply routes to OpenRouter when Gemini is unavailable."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "mock-openrouter-key")

    or_reply = "That makes sense. How would your token bucket limiter handle a Redis cluster failover event?"
    or_resp = MagicMock()
    or_resp.status_code = 200
    or_resp.json.return_value = {
        "choices": [{"message": {"content": or_reply}}]
    }

    with patch("httpx.AsyncClient.post", new_callable=AsyncMock) as mock_post:
        mock_post.return_value = or_resp
        reply_text, is_offline = await generate_voice_conversational_reply(
            role="Backend Engineer",
            difficulty="Senior",
            language="Python",
            question_text="Design a distributed rate limiter.",
            topic="Distributed Systems",
            candidate_speech="I would use Redis with Lua scripts.",
            expected_concepts=["Token Bucket", "Redis Failover"],
        )

    assert reply_text == or_reply
    assert is_offline is False


# ==============================================================================
# 6. Report Executive Narrative Fallback Tests
# ==============================================================================

@pytest.mark.anyio
async def test_report_narrative_openrouter_fallback(monkeypatch):
    """Verify executive summary narrative routes to OpenRouter fallback."""
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    monkeypatch.setattr(settings, "OPENROUTER_API_KEY", "mock-openrouter-key")

    narrative_data = {
        "summary_narrative": "The candidate demonstrated solid systems architecture skills across distributed problems.",
        "strengths": ["Clear communication", "Idempotent design patterns"],
        "improvement_areas": ["Edge case failure mode analysis"],
        "study_recommendations": ["Review Raft consensus paper", "Practice multi-region active-active patterns"],
    }
    or_resp = MagicMock()
    or_resp.status_code = 200
    or_resp.json.return_value = {
        "choices": [{"message": {"content": json.dumps(narrative_data)}}]
    }

    mock_client = AsyncMock(spec=httpx.AsyncClient)
    mock_client.post = AsyncMock(return_value=or_resp)

    narrative = await generate_report_narrative(
        role="Backend Engineer",
        difficulty=SeniorityLevel.SENIOR,
        primary_language=CodingLanguage.PYTHON,
        total_questions=3,
        answered_questions=3,
        evaluated_questions=3,
        overall_score=8.2,
        scores={"correctness": 8.5, "technical_depth": 8.0, "edge_cases": 7.5, "communication": 8.8},
        topics=["Rate Limiting", "Stream Ingestion", "Cache Invalidation"],
        aggregated_strengths=["Clear communication"],
        aggregated_missing_concepts=[],
        aggregated_suggestions=[],
        client=mock_client,
    )

    assert isinstance(narrative, GeminiReportNarrativeOutput)
    assert "systems architecture" in narrative.summary_narrative
    assert "Clear communication" in narrative.strengths
