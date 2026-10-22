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


class VoiceInteractionRequest(BaseModel):
    """Payload for browser Web Speech zero-cost conversational turn."""
    question_number: Optional[int] = Field(
        default=None,
        ge=1,
        le=10,
        description="Active question number.",
    )
    candidate_speech: str = Field(
        min_length=1,
        max_length=5000,
        description="Candidate's recognized spoken text.",
    )


class VoiceInteractionResponse(BaseModel):
    """Interviewer spoken response for browser speech synthesis."""
    session_id: str = Field(description="Interview session ID.")
    question_number: int = Field(description="Question number.")
    interviewer_reply: str = Field(description="Natural, concise interviewer speech output to synthesize.")
    is_offline: bool = Field(default=False, description="Whether response was generated using offline fallback.")
