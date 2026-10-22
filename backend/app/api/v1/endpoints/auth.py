from datetime import datetime, timedelta, timezone
from typing import Optional
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import extract_token, get_current_user
from app.core.config import settings
from app.core.security import (
    generate_random_token,
    hash_password,
    hash_token,
    verify_password,
)
from app.db.session import get_db
from app.models.user import (
    PasswordResetTokenModel,
    UserModel,
    UserSessionModel,
)
from app.schemas.auth import (
    AuthTokenResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    MessageResponse,
    ResetPasswordRequest,
    UserLoginRequest,
    UserResponse,
    UserSignupRequest,
)

router = APIRouter()


def set_auth_cookie(response: Response, token: str, expires_at: datetime) -> None:
    """Set the HttpOnly session cookie on the response."""
    max_age = max(1, int((expires_at - datetime.now(timezone.utc)).total_seconds()))
    response.set_cookie(
        key=settings.AUTH_COOKIE_NAME,
        value=token,
        max_age=max_age,
        expires=expires_at,
        httponly=True,
        secure=settings.AUTH_COOKIE_SECURE,
        samesite=settings.AUTH_COOKIE_SAMESITE,
        domain=settings.AUTH_COOKIE_DOMAIN,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    """Delete the HttpOnly session cookie."""
    response.delete_cookie(
        key=settings.AUTH_COOKIE_NAME,
        domain=settings.AUTH_COOKIE_DOMAIN,
        path="/",
    )


@router.post(
    "/signup",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def signup(
    signup_data: UserSignupRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AuthTokenResponse:
    """Create a new user account with Argon2id password hashing and active session."""
    # Check for existing account with normalized email
    stmt = select(UserModel).where(UserModel.email == signup_data.email)
    result = await db.execute(stmt)
    if result.scalar_one_or_none() is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="An account with this email address already exists. Please log in.",
        )

    # Hash password using Argon2id
    hashed = hash_password(signup_data.password)
    user_id = f"usr-{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc)

    new_user = UserModel(
        id=user_id,
        email=signup_data.email,
        full_name=signup_data.full_name,
        hashed_password=hashed,
        is_active=True,
        is_verified=False,
        created_at=now,
        updated_at=now,
    )
    db.add(new_user)

    # Establish new authenticated session
    raw_session_token = generate_random_token(32)
    session_expires = now + timedelta(days=settings.SESSION_EXPIRE_DAYS)

    session_record = UserSessionModel(
        id=f"sess-{uuid.uuid4().hex[:12]}",
        user_id=user_id,
        token_hash=hash_token(raw_session_token),
        expires_at=session_expires,
        is_revoked=False,
        created_at=now,
        user_agent=request.headers.get("user-agent", "")[:255] or None,
        ip_address=request.client.host if request.client else None,
    )
    db.add(session_record)

    try:
        await db.commit()
        await db.refresh(new_user)
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Registration failed: {type(exc).__name__}",
        )

    # Set secure HttpOnly session cookie
    set_auth_cookie(response, raw_session_token, session_expires)

    return AuthTokenResponse(
        user=UserResponse.model_validate(new_user),
        session_token=raw_session_token,
        token_type="bearer",
        expires_at=session_expires,
    )


@router.post(
    "/login",
    response_model=AuthTokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate with email and password",
)
async def login(
    login_data: UserLoginRequest,
    response: Response,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> AuthTokenResponse:
    """Authenticate user credentials and issue session token / HttpOnly cookie."""
    # Look up user by email
    stmt = select(UserModel).where(UserModel.email == login_data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    # Generic error message avoids user enumeration
    invalid_creds_exc = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    if not user:
        raise invalid_creds_exc

    if not verify_password(login_data.password, user.hashed_password):
        raise invalid_creds_exc

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. Please contact support.",
        )

    # Create new session
    now = datetime.now(timezone.utc)
    raw_session_token = generate_random_token(32)
    session_expires = now + timedelta(days=settings.SESSION_EXPIRE_DAYS)

    session_record = UserSessionModel(
        id=f"sess-{uuid.uuid4().hex[:12]}",
        user_id=user.id,
        token_hash=hash_token(raw_session_token),
        expires_at=session_expires,
        is_revoked=False,
        created_at=now,
        user_agent=request.headers.get("user-agent", "")[:255] or None,
        ip_address=request.client.host if request.client else None,
    )
    db.add(session_record)

    try:
        await db.commit()
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {type(exc).__name__}",
        )

    set_auth_cookie(response, raw_session_token, session_expires)

    return AuthTokenResponse(
        user=UserResponse.model_validate(user),
        session_token=raw_session_token,
        token_type="bearer",
        expires_at=session_expires,
    )


@router.post(
    "/logout",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Invalidate active session and clear cookie",
)
async def logout(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Revoke the current session token in database and clear the client cookie."""
    token = extract_token(request)
    if token:
        hashed = hash_token(token)
        now = datetime.now(timezone.utc)
        stmt = (
            update(UserSessionModel)
            .where(UserSessionModel.token_hash == hashed)
            .values(is_revoked=True, revoked_at=now)
        )
        try:
            await db.execute(stmt)
            await db.commit()
        except Exception:
            await db.rollback()

    clear_auth_cookie(response)
    return MessageResponse(message="Logged out successfully.", success=True)


@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get authenticated user profile",
)
async def get_me(
    current_user: UserModel = Depends(get_current_user),
) -> UserResponse:
    """Retrieve profile of the currently authenticated user."""
    return UserResponse.model_validate(current_user)


@router.post(
    "/forgot-password",
    response_model=ForgotPasswordResponse,
    status_code=status.HTTP_200_OK,
    summary="Initiate password recovery",
)
async def forgot_password(
    forgot_data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> ForgotPasswordResponse:
    """Generate a single-use, time-limited password reset token without revealing user existence."""
    stmt = select(UserModel).where(UserModel.email == forgot_data.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    dev_token: Optional[str] = None
    if user and user.is_active:
        now = datetime.now(timezone.utc)
        raw_reset_token = generate_random_token(32)
        token_expires = now + timedelta(hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS)

        reset_record = PasswordResetTokenModel(
            id=f"rst-{uuid.uuid4().hex[:12]}",
            user_id=user.id,
            token_hash=hash_token(raw_reset_token),
            expires_at=token_expires,
            is_used=False,
            created_at=now,
        )
        db.add(reset_record)
        try:
            await db.commit()
            dev_token = raw_reset_token
        except Exception:
            await db.rollback()

    # Always return identical safe message to prevent email enumeration
    return ForgotPasswordResponse(
        message="If an account with that email exists, password reset instructions have been sent.",
        reset_token=dev_token if settings.ENVIRONMENT == "development" else None,
    )


@router.post(
    "/reset-password",
    response_model=MessageResponse,
    status_code=status.HTTP_200_OK,
    summary="Reset password using valid token",
)
async def reset_password(
    reset_data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> MessageResponse:
    """Consume a valid password reset token and update the user's password."""
    now = datetime.now(timezone.utc)
    hashed_token = hash_token(reset_data.token)

    stmt = select(PasswordResetTokenModel).where(
        PasswordResetTokenModel.token_hash == hashed_token,
        PasswordResetTokenModel.is_used.is_(False),
        PasswordResetTokenModel.expires_at > now,
    )
    result = await db.execute(stmt)
    reset_record = result.scalar_one_or_none()

    if not reset_record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The password reset link is invalid or has expired. Please request a new one.",
        )

    user = await db.get(UserModel, reset_record.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User associated with this reset link no longer exists.",
        )

    # Update password with new Argon2id hash
    user.hashed_password = hash_password(reset_data.new_password)
    user.updated_at = now
    reset_record.is_used = True

    # Security best practice: revoke all active sessions upon password reset
    stmt_sessions = (
        update(UserSessionModel)
        .where(
            UserSessionModel.user_id == user.id,
            UserSessionModel.is_revoked.is_(False),
        )
        .values(is_revoked=True, revoked_at=now)
    )
    await db.execute(stmt_sessions)

    try:
        await db.commit()
    except Exception as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Password reset failed: {type(exc).__name__}",
        )

    return MessageResponse(
        message="Your password has been successfully reset. Please log in with your new password.",
        success=True,
    )
