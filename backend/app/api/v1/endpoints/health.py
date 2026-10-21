from fastapi import APIRouter
from pydantic import BaseModel
from sqlalchemy import text

from app.core.config import settings
from app.db.session import get_engine

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str


class DbHealthResponse(BaseModel):
    status: str
    database: str
    connected: bool
    message: str


@router.get("/health", response_model=HealthResponse, summary="Service Health Check")
async def health_check() -> HealthResponse:
    """Returns the operational status of the API service."""
    return HealthResponse(
        status="ok",
        app="AI Technical Mock Interviewer API",
        version="0.1.0",
    )


@router.get("/health/db", response_model=DbHealthResponse, summary="Database Connectivity Check")
async def db_health_check() -> DbHealthResponse:
    """Verifies connectivity to PostgreSQL safely without exposing credentials."""
    if not settings.DATABASE_URL:
        return DbHealthResponse(
            status="unconfigured",
            database="postgresql",
            connected=False,
            message="DATABASE_URL is not set in environment or .env file.",
        )
    try:
        engine = get_engine()
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            if result.scalar() == 1:
                return DbHealthResponse(
                    status="ok",
                    database="postgresql",
                    connected=True,
                    message="Database connection verified successfully.",
                )
    except Exception as exc:
        return DbHealthResponse(
            status="error",
            database="postgresql",
            connected=False,
            message=f"Database unreachable ({type(exc).__name__}).",
        )

    return DbHealthResponse(
        status="error",
        database="postgresql",
        connected=False,
        message="Database query returned unexpected result.",
    )
