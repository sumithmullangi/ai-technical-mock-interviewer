import re
from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator, model_validator


class UserSignupRequest(BaseModel):
    """Schema for candidate user registration."""
    full_name: str = Field(..., min_length=2, max_length=100, description="Full name")
    email: EmailStr = Field(..., description="Valid candidate email address")
    password: str = Field(..., min_length=8, max_length=128, description="Password (min 8 chars)")
    confirm_password: str = Field(..., min_length=8, max_length=128, description="Password confirmation")

    @field_validator("full_name")
    @classmethod
    def validate_full_name(cls, v: str) -> str:
        clean = v.strip()
        if len(clean) < 2:
            raise ValueError("Full name must be at least 2 characters long")
        return clean

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit or number")
        return v

    @model_validator(mode="after")
    def verify_passwords_match(self) -> "UserSignupRequest":
        if self.password != self.confirm_password:
            raise ValueError("Passwords do not match")
        return self


class UserLoginRequest(BaseModel):
    """Schema for user authentication credentials."""
    email: EmailStr = Field(..., description="Registered email address")
    password: str = Field(..., min_length=1, description="Account password")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class UserResponse(BaseModel):
    """Public user profile data."""
    id: str
    email: str
    full_name: str
    is_active: bool = True
    is_verified: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @field_validator("is_verified", mode="before")
    @classmethod
    def default_is_verified(cls, v: Any) -> bool:
        return bool(v) if v is not None else False

    @field_validator("is_active", mode="before")
    @classmethod
    def default_is_active(cls, v: Any) -> bool:
        return bool(v) if v is not None else True


class AuthTokenResponse(BaseModel):
    """Response returned upon successful authentication containing user and session token."""
    user: UserResponse
    session_token: str
    access_token: Optional[str] = None
    token_type: str = "bearer"
    expires_at: datetime

    def model_post_init(self, __context: Any) -> None:
        if self.access_token is None:
            self.access_token = self.session_token


class ForgotPasswordRequest(BaseModel):
    """Request schema to initiate a password recovery."""
    email: EmailStr = Field(..., description="Registered user email")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, v: str) -> str:
        return v.strip().lower()


class ForgotPasswordResponse(BaseModel):
    """Safe response for password reset requests."""
    message: str
    # In development or when email delivery is local, provide reset token for end-to-end testing
    reset_token: Optional[str] = None


class ResetPasswordRequest(BaseModel):
    """Request schema for consuming a password reset token."""
    token: str = Field(..., min_length=10, description="Password reset token")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_new_password: str = Field(..., min_length=8, max_length=128, description="Confirm new password")

    @field_validator("new_password")
    @classmethod
    def validate_new_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters long")
        if not re.search(r"[A-Za-z]", v):
            raise ValueError("Password must contain at least one letter")
        if not re.search(r"[0-9]", v):
            raise ValueError("Password must contain at least one digit")
        return v

    @model_validator(mode="after")
    def verify_new_passwords_match(self) -> "ResetPasswordRequest":
        if self.new_password != self.confirm_new_password:
            raise ValueError("New passwords do not match")
        return self


class MessageResponse(BaseModel):
    """Generic status and message response."""
    message: str
    success: bool = True
