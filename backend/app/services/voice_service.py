import logging
from typing import Any, Dict, List, Optional, Tuple
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

OPENAI_REALTIME_CLIENT_SECRETS_URL = "https://api.openai.com/v1/realtime/client_secrets"


class VoiceServiceError(Exception):
    """Base exception for voice interviewer service errors."""
    pass


class VoiceServiceNotConfiguredError(VoiceServiceError):
    """Raised when the voice service credentials are not configured."""
    pass


class VoiceServiceProviderError(VoiceServiceError):
    """Raised when the upstream voice provider (OpenAI) returns an error or fails."""
    pass


async def request_realtime_session(
    role: str,
    difficulty: str,
    language: str,
    question_text: str,
    topic: str,
    voice: Optional[str] = None,
) -> Dict[str, Any]:
    """Requests an ephemeral client token from OpenAI Realtime API for browser WebRTC.

    Uses the official POST /v1/realtime/client_secrets endpoint to mint an ephemeral token (ek_...)
    bound to the session instructions and voice configuration.

    Returns:
        dict containing 'client_secret', 'expires_at', 'model', and 'voice'.

    Raises:
        VoiceServiceNotConfiguredError: If OPENAI_API_KEY is not set.
        VoiceServiceProviderError: If OpenAI API request fails.
    """
    if not settings.OPENAI_API_KEY:
        raise VoiceServiceNotConfiguredError(
            "Real-time voice service is unconfigured. OPENAI_API_KEY is not set on the server."
        )

    voice_name = voice or settings.OPENAI_REALTIME_VOICE

    instructions = (
        f"You are a professional, rigorous, and supportive technical mock interviewer conducting a live interview "
        f"for a {difficulty} {role} position focusing on {language}.\n\n"
        f"Current challenge topic: {topic}\n"
        f"Current question statement:\n\"{question_text}\"\n\n"
        "Interview conduct guidelines:\n"
        "1. Start by warmly greeting the candidate concisely, state the technical challenge clearly and naturally, "
        "and invite them to share their thought process.\n"
        "2. Listen actively to the candidate's spoken technical approach and code structure.\n"
        "3. Acknowledge their explanation concisely, then ask a relevant, targeted technical follow-up question "
        "(probing algorithmic trade-offs, time/space complexity, edge cases, scalability, or concurrency).\n"
        "4. Keep your turns concise and professional (1 to 3 sentences per turn), like a senior engineer interviewer. "
        "Do not monologue, lecture, or reveal full answers prematurely.\n"
        "5. Stay strictly focused on the current technical challenge and topic. Do not conclude or advance to "
        "subsequent questions on your own—the candidate will authoritatively advance the interview through the platform."
    )

    # Current official payload format for POST /v1/realtime/client_secrets
    payload = {
        "expires_after": {
            "anchor": "created_at",
            "seconds": 600,
        },
        "session": {
            "type": "realtime",
            "model": settings.OPENAI_REALTIME_MODEL,
            "instructions": instructions,
            "audio": {
                "input": {
                    "transcription": {
                        "model": "whisper-1",
                    },
                    "turn_detection": {
                        "type": "server_vad",
                        "threshold": 0.5,
                        "prefix_padding_ms": 300,
                        "silence_duration_ms": 600,
                    },
                },
                "output": {
                    "voice": voice_name,
                },
            },
        },
    }

    headers = {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                OPENAI_REALTIME_CLIENT_SECRETS_URL,
                json=payload,
                headers=headers,
            )

        if response.status_code not in (200, 201):
            # Extract safe error detail without leaking credentials
            detail = "Upstream provider error"
            try:
                err_json = response.json()
                if "error" in err_json and isinstance(err_json["error"], dict):
                    detail = err_json["error"].get("message", detail)
            except Exception:
                detail = response.text[:200] or detail

            logger.error(f"OpenAI Realtime client_secrets request failed: HTTP {response.status_code}")
            raise VoiceServiceProviderError(
                f"OpenAI Realtime API rejected client secret creation (HTTP {response.status_code}): {detail}"
            )

        data = response.json()
        # Official client_secrets endpoint returns {"value": "ek_...", "expires_at": ...}
        # Fall back to legacy preview {"client_secret": {"value": ...}} if present
        client_secret_value = data.get("value")
        if not client_secret_value:
            client_secret_data = data.get("client_secret", {})
            if isinstance(client_secret_data, dict):
                client_secret_value = client_secret_data.get("value")
            elif isinstance(client_secret_data, str):
                client_secret_value = client_secret_data

        if not client_secret_value:
            raise VoiceServiceProviderError(
                "OpenAI Realtime API response did not contain a valid ephemeral client secret."
            )

        expires_at = data.get("expires_at")
        if expires_at is None and isinstance(data.get("client_secret"), dict):
            expires_at = data["client_secret"].get("expires_at")

        # Resolve model returned from effective session or configured setting
        effective_session = data.get("session") if isinstance(data.get("session"), dict) else {}
        returned_model = effective_session.get("model") or data.get("model") or settings.OPENAI_REALTIME_MODEL

        return {
            "client_secret": client_secret_value,
            "expires_at": expires_at,
            "model": returned_model,
            "voice": voice_name,
        }

    except httpx.RequestError as exc:
        logger.error(f"Network error connecting to OpenAI Realtime API: {type(exc).__name__}")
        raise VoiceServiceProviderError(
            "Failed to connect to OpenAI Realtime service (network connection error or timeout)."
        ) from exc


async def generate_voice_conversational_reply(
    role: str,
    difficulty: str,
    language: str,
    question_text: str,
    topic: str,
    candidate_speech: str,
    expected_concepts: Optional[List[str]] = None,
) -> Tuple[str, bool]:
    """Generates a concise 1-2 sentence spoken follow-up from the AI interviewer.

    Zero-cost & Free Quota Resilient:
    - If GEMINI_API_KEY is configured: attempts to synthesize a dynamic, conversational response
      via Google Gemini's free tier.
    - If GEMINI_API_KEY is not configured or quota is exhausted (HTTP 429) or transient error occurs:
      gracefully falls back to deterministic, intelligent offline follow-up templates matching the
      active question and its expected architectural concepts.

    Returns:
        Tuple of (interviewer_reply_text, is_offline)
    """
    clean_speech = candidate_speech.strip()
    primary_concept = expected_concepts[0] if expected_concepts and len(expected_concepts) > 0 else "algorithmic complexity"
    secondary_concept = expected_concepts[1] if expected_concepts and len(expected_concepts) > 1 else "edge cases"

    # 1. Deterministic offline fallback builder
    def build_offline_reply() -> str:
        idx = len(clean_speech) % 3
        if idx == 0:
            return (
                f"Understood. How would your proposed approach address {primary_concept}, "
                f"and what are the time and space complexity trade-offs?"
            )
        elif idx == 1:
            return (
                f"That's a reasonable direction. Could you walk me through the primary failure modes or "
                f"{secondary_concept} in this design, and how you would mitigate them?"
            )
        else:
            return (
                f"Good explanation. If the data volume or traffic scale increases by a factor of 100, "
                f"where does your solution bottleneck, and how would you optimize {primary_concept}?"
            )

    # If GEMINI_API_KEY is unset or empty, use the intelligent offline fallback
    if not settings.GEMINI_API_KEY or not settings.GEMINI_API_KEY.strip():
        logger.info("Zero-cost voice mode: GEMINI_API_KEY not configured. Using offline conversational follow-up.")
        return build_offline_reply(), True

    # 2. Dynamic generation via Gemini Free Tier
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{settings.GEMINI_MODEL}:generateContent"
    headers = {
        "Content-Type": "application/json",
        "x-goog-api-key": settings.GEMINI_API_KEY.strip(),
    }

    system_instruction = (
        "You are an expert senior engineering mock interviewer conducting a live conversational interview. "
        "Keep your response strictly to 1 or 2 natural spoken sentences. "
        "Concisely acknowledge the candidate's explanation, then probe a key technical trade-off, "
        "algorithmic time/space complexity, edge cases, or scalability. Do not monologue, provide code, or lecture."
    )
    user_prompt = (
        f"Position: {difficulty} {role} ({language})\n"
        f"Challenge Topic: {topic}\n"
        f"Technical Question: \"{question_text}\"\n"
        f"Candidate just explained: \"{clean_speech}\"\n\n"
        "Generate a 1-2 sentence spoken interviewer reply acknowledging their approach and asking a targeted technical follow-up question."
    )

    payload = {
        "system_instruction": {
            "parts": [{"text": system_instruction}]
        },
        "contents": [
            {
                "role": "user",
                "parts": [{"text": user_prompt}]
            }
        ],
        "generationConfig": {
            "temperature": 0.4,
            "maxOutputTokens": 150,
        },
    }

    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.post(endpoint, headers=headers, json=payload)

        if response.status_code == 200:
            res_json = response.json()
            candidates = res_json.get("candidates", [])
            if candidates:
                first_cand = candidates[0]
                content = first_cand.get("content", {})
                parts = content.get("parts", [])
                if parts and "text" in parts[0]:
                    reply_text = parts[0]["text"].strip()
                    # Sanitize any accidental markdown formatting or quote wraps
                    reply_text = reply_text.strip('"').strip("'").strip()
                    if reply_text:
                        return reply_text, False

        # If HTTP 429 quota exhausted or other non-200 code, safely fallback without failing
        logger.warning(
            f"Gemini API returned status {response.status_code} during voice interaction. Falling back to offline response."
        )
        return build_offline_reply(), True

    except Exception as exc:
        logger.warning(
            f"Exception during Gemini voice interaction ({type(exc).__name__}). Falling back to offline response."
        )
        return build_offline_reply(), True
