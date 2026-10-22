from datetime import datetime, timezone
from typing import Optional
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.security import decode_jwt_token, hash_token
from app.db.session import get_db
from app.models.user import UserModel, UserSessionModel


def extract_token(request: Request) -> Optional[str]:
    """Extract session token from Authorization Bearer header or HttpOnly cookie."""
    # 1. Check Authorization header
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.strip():
        parts = auth_header.strip().split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            return parts[1]

    # 2. Check HttpOnly cookie
    cookie_token = request.cookies.get(settings.AUTH_COOKIE_NAME)
    if cookie_token and cookie_token.strip():
        return cookie_token.strip()

    return None


async def authenticate_token(token: str, db: AsyncSession) -> Optional[UserModel]:
    """Validate token against active database sessions or valid JWT claims."""
    now = datetime.now(timezone.utc)
    hashed = hash_token(token)

    # 1. Primary lookup: database session record with eagerly loaded user
    stmt = (
        select(UserSessionModel)
        .options(selectinload(UserSessionModel.user))
        .where(
            UserSessionModel.token_hash == hashed,
            UserSessionModel.is_revoked.is_(False),
            UserSessionModel.expires_at > now,
        )
    )
    result = await db.execute(stmt)
    session_record = result.scalar_one_or_none()

    if session_record:
        user = getattr(session_record, "user", None)
        if isinstance(user, UserModel) and user.is_active:
            return user
        # Fallback if user relationship was mocked or not preloaded
        if session_record.user_id:
            db_user = await db.get(UserModel, session_record.user_id)
            if db_user and db_user.is_active:
                return db_user
        return None

    # 2. Fallback lookup: signed JWT token
    payload = decode_jwt_token(token)
    if payload and "sub" in payload:
        user_id = payload["sub"]
        user = await db.get(UserModel, user_id)
        if user and user.is_active:
            return user

    return None


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> UserModel:
    """Dependency that enforces active authentication; raises 401 if unauthorized."""
    token = extract_token(request)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = await authenticate_token(token, db)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session. Please log in again.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


async def get_optional_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Optional[UserModel]:
    """Dependency that returns the current UserModel if authenticated, or None if guest."""
    token = extract_token(request)
    if not token:
        return None
    return await authenticate_token(token, db)
