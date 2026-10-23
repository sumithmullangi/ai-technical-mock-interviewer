from typing import Optional, List, TYPE_CHECKING
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    String,
    Text,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

if TYPE_CHECKING:
    from app.models.interview import InterviewSessionModel


class UserModel(Base):
    """Database model persisting registered user accounts."""
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
        default=lambda: f"usr-{uuid.uuid4().hex[:12]}",
        comment="Unique user identifier (usr-xxxx)",
    )
    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        index=True,
        nullable=False,
        comment="Normalized unique email address",
    )
    full_name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        comment="Candidate full name",
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Argon2id password hash",
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True,
        nullable=False,
        comment="Whether the account is active",
    )
    is_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether the account email is verified",
    )
    target_role: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
        comment="Preferred professional role / job track",
    )
    experience_level: Mapped[Optional[str]] = mapped_column(
        String(50),
        nullable=True,
        comment="Candidate experience level (Junior, Mid, Senior, Staff)",
    )
    preferences: Mapped[Optional[dict]] = mapped_column(
        JSON,
        nullable=True,
        server_default="{}",
        comment="User application preferences (theme, default_mode, etc.)",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Account registration timestamp (UTC)",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Account profile update timestamp (UTC)",
    )

    # Relationships
    sessions: Mapped[List["UserSessionModel"]] = relationship(
        "UserSessionModel",
        back_populates="user",
        cascade="all, delete-orphan",
    )
    interviews: Mapped[List["InterviewSessionModel"]] = relationship(
        "InterviewSessionModel",
        back_populates="user",
    )
    password_resets: Mapped[List["PasswordResetTokenModel"]] = relationship(
        "PasswordResetTokenModel",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class UserSessionModel(Base):
    """Database model tracking active and revoked user authentication sessions."""
    __tablename__ = "user_sessions"

    id: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
        default=lambda: f"sess-{uuid.uuid4().hex[:12]}",
        comment="Unique session identifier (sess-xxxx)",
    )
    user_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key referencing users.id",
    )
    token_hash: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        index=True,
        nullable=False,
        comment="SHA-256 hash of the session token",
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="Session expiration timestamp (UTC)",
    )
    is_revoked: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether this session has been explicitly logged out/revoked",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Session establishment timestamp (UTC)",
    )
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when session was revoked (UTC)",
    )
    user_agent: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Client browser user-agent header",
    )
    ip_address: Mapped[Optional[str]] = mapped_column(
        String(45),
        nullable=True,
        comment="Client IP address",
    )

    user: Mapped["UserModel"] = relationship(
        "UserModel",
        back_populates="sessions",
    )


class PasswordResetTokenModel(Base):
    """Database model storing single-use, time-limited password reset tokens."""
    __tablename__ = "password_reset_tokens"

    id: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
        default=lambda: f"rst-{uuid.uuid4().hex[:12]}",
        comment="Unique reset token record identifier (rst-xxxx)",
    )
    user_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key referencing users.id",
    )
    token_hash: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        index=True,
        nullable=False,
        comment="SHA-256 hash of the reset token",
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        comment="Token expiration timestamp (UTC)",
    )
    is_used: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
        comment="Whether this reset token has already been consumed",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        comment="Token creation timestamp (UTC)",
    )

    user: Mapped["UserModel"] = relationship(
        "UserModel",
        back_populates="password_resets",
    )
