import uuid
from datetime import datetime, timezone
from sqlalchemy import DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class InterviewSessionModel(Base):
    """Database model storing configured interview sessions."""
    __tablename__ = "interview_sessions"

    id: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
        default=lambda: f"mock-{uuid.uuid4().hex[:12]}",
        comment="Unique session identifier (mock-xxxx)",
    )
    role: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Target engineering role",
    )
    difficulty: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="Senior",
        comment="Seniority level (Junior, Mid, Senior, Staff)",
    )
    primary_language: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="Python",
        comment="Primary programming language",
    )
    question_count: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=5,
        comment="Configured primary question count (3-10)",
    )
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="configured",
        comment="Lifecycle status (configured, in_progress, completed)",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        comment="Session creation timestamp (UTC)",
    )
