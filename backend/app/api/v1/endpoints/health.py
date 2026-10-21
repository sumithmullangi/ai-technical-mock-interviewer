from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class HealthResponse(BaseModel):
    status: str
    app: str
    version: str


@router.get("/health", response_model=HealthResponse, summary="Service Health Check")
async def health_check() -> HealthResponse:
    """Returns the operational status of the API service."""
    return HealthResponse(
        status="ok",
        app="AI Technical Mock Interviewer API",
        version="0.1.0",
    )
