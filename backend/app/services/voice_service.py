import logging
from typing import Any, Dict, Optional
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
