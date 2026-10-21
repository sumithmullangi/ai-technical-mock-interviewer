from datetime import datetime, timezone
from enum import Enum
from typing import Any
from pydantic import BaseModel, Field, model_validator, computed_field


class SeniorityLevel(str, Enum):
    JUNIOR = "Junior"
    MID = "Mid"
    SENIOR = "Senior"
    STAFF = "Staff"


class CodingLanguage(str, Enum):
    PYTHON = "Python"
    JAVA = "Java"
    SQL = "SQL"


class InterviewConfigCreate(BaseModel):
    role: str = Field(
        ...,
        min_length=2,
        max_length=100,
        description="Target engineering role, e.g. Backend Engineer",
    )
    difficulty: SeniorityLevel = Field(
        default=SeniorityLevel.SENIOR,
        description="Seniority level (Junior, Mid, Senior, Staff)",
    )
    primary_language: CodingLanguage = Field(
        default=CodingLanguage.PYTHON,
        description="Primary coding language for static review (Python, Java, SQL)",
    )
    question_count: int = Field(
        default=5,
        ge=3,
        le=10,
        description="Total primary questions (between 3 and 10, default 5)",
    )

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            # Normalize camelCase to snake_case if snake_case not explicitly given
            if "primaryLanguage" in data and "primary_language" not in data:
                data["primary_language"] = data["primaryLanguage"]
            if "questionCount" in data and "question_count" not in data:
                data["question_count"] = data["questionCount"]
        return data

    @computed_field
    @property
    def primaryLanguage(self) -> CodingLanguage:
        return self.primary_language

    @computed_field
    @property
    def questionCount(self) -> int:
        return self.question_count


class InterviewConfigResponse(BaseModel):
    status: str = Field(
        default="configured",
        description="Status of the interview configuration",
    )
    session_id: str = Field(
        ...,
        description="Ephemeral session identifier generated for this configuration",
    )
    config: InterviewConfigCreate = Field(
        ...,
        description="Validated interview configuration details",
    )
    message: str = Field(
        default="Interview configuration validated successfully.",
        description="Confirmation message from the server",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when configuration was processed",
    )
