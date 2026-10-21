import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, status
from app.schemas.interview import InterviewConfigCreate, InterviewConfigResponse

router = APIRouter()


@router.post(
    "/config",
    response_model=InterviewConfigResponse,
    status_code=status.HTTP_200_OK,
    summary="Validate and register interview configuration",
)
async def configure_interview(config: InterviewConfigCreate) -> InterviewConfigResponse:
    """Validates the candidate interview configuration.
    
    Ensures:
    - Engineering role is between 2 and 100 characters.
    - Seniority is one of Junior, Mid, Senior, Staff.
    - Coding language is one of Python, Java, SQL.
    - Question count is strictly bounded between 3 and 10.
    """
    ephemeral_session_id = f"mock-{uuid.uuid4().hex[:12]}"
    
    return InterviewConfigResponse(
        status="configured",
        session_id=ephemeral_session_id,
        config=config,
        message="Interview configuration validated successfully. Ready for session initiation.",
        created_at=datetime.now(timezone.utc),
    )
