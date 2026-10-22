from datetime import datetime, timezone
from enum import Enum
from typing import Any, List, Optional
from pydantic import BaseModel, Field, computed_field, field_validator, model_validator


class AnswerSubmitRequest(BaseModel):
    """Pydantic schema for candidate answer submission."""
    question_number: int = Field(
        default=1,
        ge=1,
        description="Sequential index of the question being answered (1-based)",
    )
    answer_text: str = Field(
        ...,
        min_length=1,
        description="Candidate technical explanation or implementation",
    )

    @field_validator("answer_text")
    @classmethod
    def validate_answer_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Answer text cannot be empty or whitespace only.")
        return v.strip()

    @model_validator(mode="before")
    @classmethod
    def handle_aliases(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "questionNumber" in data and "question_number" not in data:
                data["question_number"] = data["questionNumber"]
            if "answerText" in data and "answer_text" not in data:
                data["answer_text"] = data["answerText"]
            elif "answer" in data and "answer_text" not in data:
                data["answer_text"] = data["answer"]
            elif "response" in data and "answer_text" not in data:
                data["answer_text"] = data["response"]
        return data


class AnswerSubmitResponse(BaseModel):
    """Schema returned upon successful answer persistence."""
    status: str = Field(
        default="submitted",
        description="Status confirmation of the submission",
    )
    answer_id: str = Field(
        ...,
        description="Unique identifier for the persisted answer record (ans-xxxx)",
    )
    session_id: str = Field(
        ...,
        description="Associated interview session ID",
    )
    question_number: int = Field(
        ...,
        description="The question number that was answered",
    )
    message: str = Field(
        default="Answer submitted and persisted successfully.",
        description="Confirmation message from the server",
    )
    submitted_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when answer was recorded",
    )


class EvaluationScoresSchema(BaseModel):
    """Four core evaluation dimension scores (0.0 to 10.0 scale)."""
    correctness: float = Field(
        ...,
        ge=0.0,
        le=10.0,
        description="Correctness and algorithmic validity (0-10, weight 40%)",
    )
    technical_depth: float = Field(
        ...,
        ge=0.0,
        le=10.0,
        description="Technical and architectural depth (0-10, weight 25%)",
    )
    edge_cases: float = Field(
        ...,
        ge=0.0,
        le=10.0,
        description="Edge cases, scalability, and error resilience (0-10, weight 20%)",
    )
    communication: float = Field(
        ...,
        ge=0.0,
        le=10.0,
        description="Communication clarity and structured reasoning (0-10, weight 15%)",
    )


class GeminiEvaluationOutput(BaseModel):
    """Raw structured output schema requested from Gemini API."""
    correctness: float = Field(..., ge=0.0, le=10.0)
    technical_depth: float = Field(..., ge=0.0, le=10.0)
    edge_cases: float = Field(..., ge=0.0, le=10.0)
    communication: float = Field(..., ge=0.0, le=10.0)
    feedback: str = Field(..., min_length=5, description="Concise qualitative summary of candidate answer")
    strengths: List[str] = Field(default_factory=list, description="Key technical strengths observed")
    missing_concepts: List[str] = Field(default_factory=list, description="Omitted concepts, trade-offs, or constraints")
    suggestions: List[str] = Field(default_factory=list, description="Actionable recommendations for improvement")


def calculate_weighted_overall_score(
    correctness: float,
    technical_depth: float,
    edge_cases: float,
    communication: float,
) -> float:
    """Calculates backend-authoritative weighted overall score (0.0 - 10.0).

    Weights:
    - Correctness: 40% (0.40)
    - Technical Depth: 25% (0.25)
    - Edge Cases: 20% (0.20)
    - Communication & Clarity: 15% (0.15)
    """
    scores = {
        "correctness": correctness,
        "technical_depth": technical_depth,
        "edge_cases": edge_cases,
        "communication": communication,
    }
    for name, val in scores.items():
        if not isinstance(val, (int, float)) or val < 0.0 or val > 10.0:
            raise ValueError(f"Score '{name}' must be between 0.0 and 10.0, got {val}")

    weighted = (
        correctness * 0.40
        + technical_depth * 0.25
        + edge_cases * 0.20
        + communication * 0.15
    )
    return round(weighted, 2)


class AnswerEvaluationRequest(BaseModel):
    """Request payload for evaluating an answer."""
    answer_id: Optional[str] = Field(
        default=None,
        description="Candidate answer ID if not specified in URL path",
    )
    question_text: Optional[str] = Field(
        default=None,
        description="Optional problem statement for evaluation context",
    )
    topic: Optional[str] = Field(
        default=None,
        description="Optional question topic",
    )
    expected_concepts: Optional[List[str]] = Field(
        default=None,
        description="Optional list of expected architectural concepts",
    )


class AnswerEvaluationResponse(BaseModel):
    """Schema returned upon successful AI evaluation and persistence."""
    status: str = Field(
        default="evaluated",
        description="Evaluation status confirmation",
    )
    evaluation_id: str = Field(
        ...,
        description="Unique identifier for the persisted evaluation (eval-xxxx)",
    )
    answer_id: str = Field(
        ...,
        description="Evaluated answer identifier",
    )
    session_id: str = Field(
        ...,
        description="Associated interview session ID",
    )
    scores: EvaluationScoresSchema = Field(
        ...,
        description="Component scores across all four dimensions (0-10)",
    )
    overall_score: float = Field(
        ...,
        ge=0.0,
        le=10.0,
        description="Backend-calculated weighted overall score (0.0 - 10.0)",
    )
    feedback: str = Field(
        ...,
        description="Concise qualitative summary of candidate performance",
    )
    strengths: List[str] = Field(
        default_factory=list,
        description="Observed technical strengths",
    )
    missing_concepts: List[str] = Field(
        default_factory=list,
        description="Missing concepts or omitted considerations",
    )
    suggestions: List[str] = Field(
        default_factory=list,
        description="Actionable recommendations for improvement",
    )
    evaluated_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when evaluation was performed and persisted",
    )


class FollowUpQuestionOutput(BaseModel):
    """Raw structured output schema requested from Gemini for follow-up questions."""
    question_text: str = Field(
        ...,
        min_length=10,
        description="Targeted technical follow-up question probing specific gaps, edge cases, trade-offs, or scale",
    )
    expected_concepts: List[str] = Field(
        default_factory=list,
        description="Architectural or algorithmic concepts expected in follow-up answer",
    )
    probing_reason: str = Field(
        ...,
        description="Focus or technical rationale for this follow-up based on candidate's prior response and evaluation feedback",
    )


class FollowUpQuestionRequest(BaseModel):
    """Request payload for generating an adaptive follow-up question."""
    primary_question_number: int = Field(
        default=1,
        ge=1,
        description="Primary question number (1-based)",
    )
    question_text: Optional[str] = Field(
        default=None,
        description="Optional problem statement of primary question",
    )
    candidate_answer: Optional[str] = Field(
        default=None,
        description="Optional candidate answer text",
    )
    evaluation_feedback: Optional[str] = Field(
        default=None,
        description="Optional evaluation feedback from previous response",
    )
    missing_concepts: Optional[List[str]] = Field(
        default=None,
        description="Optional missing concepts identified during evaluation",
    )


class FollowUpQuestionResponse(BaseModel):
    """Schema returned upon generating a follow-up question."""
    status: str = Field(
        default="generated",
        description="Follow-up question status confirmation",
    )
    id: str = Field(
        ...,
        description="Unique follow-up identifier (fq-xxxx)",
    )
    session_id: str = Field(
        ...,
        description="Associated interview session ID",
    )
    primary_question_number: int = Field(
        ...,
        description="Primary question index",
    )
    follow_up_number: int = Field(
        ...,
        ge=1,
        le=2,
        description="Follow-up sequence number (1 or 2)",
    )
    question_text: str = Field(
        ...,
        description="Adaptive follow-up question text",
    )
    expected_concepts: List[str] = Field(
        default_factory=list,
        description="Expected concepts",
    )
    probing_reason: Optional[str] = Field(
        default=None,
        description="Probing rationale",
    )
    candidate_answer: Optional[str] = Field(
        default=None,
        description="Candidate's submitted answer if already answered",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Creation timestamp",
    )
    answered_at: Optional[datetime] = Field(
        default=None,
        description="Timestamp when answered",
    )


class FollowUpAnswerRequest(BaseModel):
    """Request payload for answering a follow-up question."""
    answer_text: str = Field(
        ...,
        min_length=1,
        description="Candidate answer text or code for this follow-up",
    )

    @field_validator("answer_text")
    @classmethod
    def validate_answer_not_empty(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Follow-up answer cannot be empty or whitespace only.")
        return v.strip()


class FollowUpAnswerResponse(BaseModel):
    """Schema returned upon submitting an answer to a follow-up question."""
    status: str = Field(
        default="answered",
        description="Submission confirmation",
    )
    id: str = Field(
        ...,
        description="Follow-up question ID",
    )
    session_id: str = Field(
        ...,
        description="Associated interview session ID",
    )
    primary_question_number: int = Field(
        ...,
        description="Primary question index",
    )
    follow_up_number: int = Field(
        ...,
        description="Follow-up sequence number",
    )
    candidate_answer: str = Field(
        ...,
        description="Submitted candidate answer text",
    )
    answered_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Answer timestamp",
    )
    message: str = Field(
        default="Follow-up answer submitted and persisted successfully.",
        description="Confirmation message",
    )




class SeniorityLevel(str, Enum):
    JUNIOR = "Junior"
    MID = "Mid"
    SENIOR = "Senior"
    STAFF = "Staff"


class CodingLanguage(str, Enum):
    PYTHON = "Python"
    JAVA = "Java"
    SQL = "SQL"


class SessionStatus(str, Enum):
    CONFIGURED = "configured"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class InterviewQuestionSchema(BaseModel):
    """Pydantic schema for structured interview questions."""
    question_number: int = Field(
        default=1,
        ge=1,
        description="Sequential question index within the interview session",
    )
    topic: str = Field(
        ...,
        min_length=2,
        max_length=150,
        description="Technical topic or domain, e.g. Distributed Consensus",
    )
    difficulty: SeniorityLevel = Field(
        ...,
        description="Target seniority level for the question",
    )
    question_text: str = Field(
        ...,
        min_length=10,
        description="Comprehensive technical problem statement and scenario",
    )
    starter_code: Optional[str] = Field(
        default=None,
        description="Optional starter code stub, interface, or function signature",
    )
    expected_concepts: List[str] = Field(
        default_factory=list,
        description="Key architectural concepts or keywords expected in candidate discussion",
    )


class SessionStartResponse(BaseModel):
    """Schema representing the initiated session with the first question."""
    status: SessionStatus = Field(
        default=SessionStatus.IN_PROGRESS,
        description="State machine status of the session",
    )
    session_id: str = Field(
        ...,
        description="Unique session identifier (mock-xxxx)",
    )
    current_question: InterviewQuestionSchema = Field(
        ...,
        description="First technical question presented to the candidate",
    )
    message: str = Field(
        default="Interview session started successfully.",
        description="Confirmation message from the server",
    )
    started_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when session transitioned to in-progress",
    )


class PrimaryQuestionResponse(BaseModel):
    """Schema representing a persisted primary interview question."""
    id: str = Field(..., description="Unique question identifier (pq-xxxx)")
    session_id: str = Field(..., description="Associated interview session ID")
    question_number: int = Field(..., ge=1, description="Primary question index (1-based)")
    topic: str = Field(..., description="Technical topic or domain")
    difficulty: SeniorityLevel = Field(..., description="Seniority level")
    question_text: str = Field(..., description="Problem statement and scenario")
    starter_code: Optional[str] = Field(default=None, description="Starter code stub or signature")
    expected_concepts: List[str] = Field(default_factory=list, description="Expected concepts")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Creation timestamp")

    @computed_field
    @property
    def questionNumber(self) -> int:
        return self.question_number

    @computed_field
    @property
    def questionText(self) -> str:
        return self.question_text

    @computed_field
    @property
    def starterCode(self) -> Optional[str]:
        return self.starter_code

    @computed_field
    @property
    def expectedConcepts(self) -> List[str]:
        return self.expected_concepts

    @computed_field
    @property
    def sessionId(self) -> str:
        return self.session_id


class SessionAdvanceResponse(BaseModel):
    """Schema returned upon advancing to the next primary question or completing the session."""
    status: SessionStatus = Field(
        ...,
        description="Updated session status ('in_progress' or 'completed')",
    )
    session_id: str = Field(
        ...,
        description="Interview session ID",
    )
    current_question: Optional[InterviewQuestionSchema] = Field(
        default=None,
        description="The next primary question if session remains in_progress",
    )
    question_number: int = Field(
        ...,
        description="Current question number (or final question number if completed)",
    )
    total_questions: int = Field(
        ...,
        description="Total configured questions for the session",
    )
    is_completed: bool = Field(
        default=False,
        description="Whether the entire interview has been completed",
    )
    message: str = Field(
        ...,
        description="Informational status message",
    )
    advanced_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp of advancement or completion",
    )

    @computed_field
    @property
    def sessionId(self) -> str:
        return self.session_id

    @computed_field
    @property
    def currentQuestion(self) -> Optional[InterviewQuestionSchema]:
        return self.current_question

    @computed_field
    @property
    def questionNumber(self) -> int:
        return self.question_number

    @computed_field
    @property
    def totalQuestions(self) -> int:
        return self.total_questions

    @computed_field
    @property
    def isCompleted(self) -> bool:
        return self.is_completed

    @computed_field
    @property
    def advancedAt(self) -> datetime:
        return self.advanced_at


class GeminiReportNarrativeOutput(BaseModel):
    """Schema for structured narrative generation from Gemini."""
    summary_narrative: str = Field(..., min_length=20, description="Comprehensive qualitative performance summary")
    strengths: List[str] = Field(default_factory=list, description="Key candidate strengths observed across the session")
    improvement_areas: List[str] = Field(default_factory=list, description="Key technical weaknesses or omitted concepts")
    study_recommendations: List[str] = Field(default_factory=list, description="Actionable technical study and practice recommendations")


class QuestionReportItem(BaseModel):
    """Per-question breakdown item for final interview report."""
    question_number: int = Field(..., ge=1, description="1-based question number")
    topic: str = Field(..., description="Technical topic")
    difficulty: str = Field(..., description="Seniority difficulty")
    question_text: str = Field(..., description="Problem description")
    starter_code: Optional[str] = Field(default=None, description="Starter code snippet")
    expected_concepts: List[str] = Field(default_factory=list, description="Expected concepts")
    is_answered: bool = Field(default=False, description="Whether answer was submitted")
    answer_text: Optional[str] = Field(default=None, description="Candidate submitted response")
    submitted_at: Optional[datetime] = Field(default=None, description="Answer timestamp")
    is_evaluated: bool = Field(default=False, description="Whether evaluation was completed")
    correctness_score: Optional[float] = Field(default=None, description="Correctness score (0-10)")
    technical_depth_score: Optional[float] = Field(default=None, description="Technical depth score (0-10)")
    edge_cases_score: Optional[float] = Field(default=None, description="Edge cases score (0-10)")
    communication_score: Optional[float] = Field(default=None, description="Communication score (0-10)")
    overall_score: Optional[float] = Field(default=None, description="Weighted overall score for this question (0-10)")
    feedback: Optional[str] = Field(default=None, description="Evaluation feedback")
    strengths: List[str] = Field(default_factory=list, description="Candidate strengths for this question")
    missing_concepts: List[str] = Field(default_factory=list, description="Missing concepts for this question")
    suggestions: List[str] = Field(default_factory=list, description="Suggestions for this question")
    follow_ups: List[dict] = Field(default_factory=list, description="Follow-up inquiries and answers")

    @computed_field
    @property
    def questionNumber(self) -> int:
        return self.question_number

    @computed_field
    @property
    def questionText(self) -> str:
        return self.question_text

    @computed_field
    @property
    def starterCode(self) -> Optional[str]:
        return self.starter_code

    @computed_field
    @property
    def expectedConcepts(self) -> List[str]:
        return self.expected_concepts

    @computed_field
    @property
    def isAnswered(self) -> bool:
        return self.is_answered

    @computed_field
    @property
    def answerText(self) -> Optional[str]:
        return self.answer_text

    @computed_field
    @property
    def submittedAt(self) -> Optional[datetime]:
        return self.submitted_at

    @computed_field
    @property
    def isEvaluated(self) -> bool:
        return self.is_evaluated

    @computed_field
    @property
    def correctnessScore(self) -> Optional[float]:
        return self.correctness_score

    @computed_field
    @property
    def technicalDepthScore(self) -> Optional[float]:
        return self.technical_depth_score

    @computed_field
    @property
    def edgeCasesScore(self) -> Optional[float]:
        return self.edge_cases_score

    @computed_field
    @property
    def communicationScore(self) -> Optional[float]:
        return self.communication_score

    @computed_field
    @property
    def overallScore(self) -> Optional[float]:
        return self.overall_score

    @computed_field
    @property
    def missingConcepts(self) -> List[str]:
        return self.missing_concepts

    @computed_field
    @property
    def followUps(self) -> List[dict]:
        return self.follow_ups


class ScoreBreakdown(BaseModel):
    """Aggregated score breakdown across dimensions."""
    correctness_average: Optional[float] = Field(default=None, description="Average correctness score across evaluated questions")
    technical_depth_average: Optional[float] = Field(default=None, description="Average technical depth score across evaluated questions")
    edge_cases_average: Optional[float] = Field(default=None, description="Average edge cases score across evaluated questions")
    communication_average: Optional[float] = Field(default=None, description="Average communication score across evaluated questions")
    overall_score: Optional[float] = Field(default=None, description="Backend-calculated weighted overall score")

    @computed_field
    @property
    def correctnessAverage(self) -> Optional[float]:
        return self.correctness_average

    @computed_field
    @property
    def technicalDepthAverage(self) -> Optional[float]:
        return self.technical_depth_average

    @computed_field
    @property
    def edgeCasesAverage(self) -> Optional[float]:
        return self.edge_cases_average

    @computed_field
    @property
    def communicationAverage(self) -> Optional[float]:
        return self.communication_average

    @computed_field
    @property
    def overallScore(self) -> Optional[float]:
        return self.overall_score


class InterviewReportResponse(BaseModel):
    """Schema returned upon fetching or generating a final interview performance report."""
    status: str = Field(default="completed", description="Report status")
    report_id: str = Field(..., description="Unique report ID (rep-xxxx)")
    session_id: str = Field(..., description="Associated session ID")
    role: str = Field(..., description="Role title")
    difficulty: str = Field(..., description="Seniority level")
    primary_language: str = Field(..., description="Coding language")
    total_questions: int = Field(..., description="Configured total questions")
    answered_questions: int = Field(..., description="Number of questions answered")
    evaluated_questions: int = Field(..., description="Number of questions evaluated")
    scores: ScoreBreakdown = Field(..., description="Aggregated dimension scores")
    overall_score: Optional[float] = Field(default=None, description="Overall weighted score")
    performance_rating: str = Field(default="Not Evaluated", description="Categorical rating tier")
    summary_narrative: str = Field(..., description="Executive narrative summary")
    strengths: List[str] = Field(default_factory=list, description="Aggregated candidate strengths")
    improvement_areas: List[str] = Field(default_factory=list, description="Aggregated growth areas / missing concepts")
    study_recommendations: List[str] = Field(default_factory=list, description="Actionable study recommendations")
    per_question_results: List[QuestionReportItem] = Field(default_factory=list, description="Detailed per-question breakdown")
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Creation timestamp")
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc), description="Update timestamp")

    @computed_field
    @property
    def reportId(self) -> str:
        return self.report_id

    @computed_field
    @property
    def sessionId(self) -> str:
        return self.session_id

    @computed_field
    @property
    def primaryLanguage(self) -> str:
        return self.primary_language

    @computed_field
    @property
    def totalQuestions(self) -> int:
        return self.total_questions

    @computed_field
    @property
    def answeredQuestions(self) -> int:
        return self.answered_questions

    @computed_field
    @property
    def evaluatedQuestions(self) -> int:
        return self.evaluated_questions

    @computed_field
    @property
    def overallScore(self) -> Optional[float]:
        return self.overall_score

    @computed_field
    @property
    def performanceRating(self) -> str:
        return self.performance_rating

    @computed_field
    @property
    def summaryNarrative(self) -> str:
        return self.summary_narrative

    @computed_field
    @property
    def improvementAreas(self) -> List[str]:
        return self.improvement_areas

    @computed_field
    @property
    def studyRecommendations(self) -> List[str]:
        return self.study_recommendations

    @computed_field
    @property
    def perQuestionResults(self) -> List[QuestionReportItem]:
        return self.per_question_results

    @computed_field
    @property
    def createdAt(self) -> datetime:
        return self.created_at

    @computed_field
    @property
    def updatedAt(self) -> datetime:
        return self.updated_at



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
            # Support seniority alias for difficulty
            if "seniority" in data and "difficulty" not in data:
                data["difficulty"] = data["seniority"]
            # Support coding_language / codingLanguage / primaryLanguage aliases for primary_language
            if "coding_language" in data and "primary_language" not in data:
                data["primary_language"] = data["coding_language"]
            elif "codingLanguage" in data and "primary_language" not in data:
                data["primary_language"] = data["codingLanguage"]
            elif "primaryLanguage" in data and "primary_language" not in data:
                data["primary_language"] = data["primaryLanguage"]
            # Support questionCount alias for question_count
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
    user_id: Optional[str] = Field(
        default=None,
        description="Owner user ID if associated with a candidate account",
    )
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Timestamp when configuration was processed",
    )
