from typing import Optional
from pydantic import BaseModel, Field


class VoiceSessionRequest(BaseModel):
    """Optional payload when requesting a real-time voice session."""
    question_number: Optional[int] = Field(
        default=None,
        ge=1,
        le=10,
        description="Specific question number to discuss in voice mode. If omitted, uses the current/latest question.",
    )


class VoiceSessionResponse(BaseModel):
    """Ephemeral credentials and context for browser WebRTC Realtime session."""
    session_id: str = Field(description="Interview session ID.")
    client_secret: str = Field(description="Short-lived ephemeral token for WebRTC connection.")
    expires_at: Optional[int] = Field(default=None, description="Unix timestamp when client secret expires.")
    model: str = Field(description="Realtime model identifier.")
    voice: str = Field(description="Voice persona name.")
    question_number: int = Field(description="Active question number.")
    question_text: str = Field(description="Technical question text.")
    topic: str = Field(description="Technical topic.")
    role: str = Field(description="Target engineering role.")
    difficulty: str = Field(description="Seniority level.")
