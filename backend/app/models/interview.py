from typing import Optional
import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship
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

    primary_questions: Mapped[list["PrimaryQuestionModel"]] = relationship(
        "PrimaryQuestionModel",
        back_populates="session",
        cascade="all, delete-orphan",
        order_by="PrimaryQuestionModel.question_number",
    )
    answers: Mapped[list["CandidateAnswerModel"]] = relationship(
        "CandidateAnswerModel",
        back_populates="session",
        cascade="all, delete-orphan",
    )
    follow_ups: Mapped[list["FollowUpQuestionModel"]] = relationship(
        "FollowUpQuestionModel",
        back_populates="session",
        cascade="all, delete-orphan",
    )
    report: Mapped[Optional["InterviewReportModel"]] = relationship(
        "InterviewReportModel",
        back_populates="session",
        uselist=False,
        cascade="all, delete-orphan",
    )



class CandidateAnswerModel(Base):
    """Database model persisting candidate submitted answers."""
    __tablename__ = "candidate_answers"

    id: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
        default=lambda: f"ans-{uuid.uuid4().hex[:12]}",
        comment="Unique answer identifier (ans-xxxx)",
    )
    session_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key to interview_sessions.id",
    )
    question_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        comment="Primary question index (1-based)",
    )
    answer_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Candidate submitted response text or code",
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        comment="Answer submission timestamp (UTC)",
    )

    session: Mapped["InterviewSessionModel"] = relationship(
        "InterviewSessionModel",
        back_populates="answers",
    )
    evaluation: Mapped[Optional["AnswerEvaluationModel"]] = relationship(
        "AnswerEvaluationModel",
        back_populates="answer",
        uselist=False,
        cascade="all, delete-orphan",
    )


class AnswerEvaluationModel(Base):
    """Database model persisting Gemini AI evaluations for candidate answers."""
    __tablename__ = "answer_evaluations"

    id: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
        default=lambda: f"eval-{uuid.uuid4().hex[:12]}",
        comment="Unique evaluation identifier (eval-xxxx)",
    )
    answer_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("candidate_answers.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        comment="1-to-1 foreign key referencing candidate_answers.id",
    )
    session_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key referencing interview_sessions.id",
    )
    correctness_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="Correctness score (0.0 - 10.0, weight 40%)",
    )
    technical_depth_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="Technical depth score (0.0 - 10.0, weight 25%)",
    )
    edge_cases_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="Edge cases score (0.0 - 10.0, weight 20%)",
    )
    communication_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="Communication clarity score (0.0 - 10.0, weight 15%)",
    )
    overall_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        comment="Backend-calculated weighted overall score (0.0 - 10.0)",
    )
    feedback: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Concise qualitative summary of the candidate's performance",
    )
    strengths: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        comment="List of candidate's key technical strengths",
    )
    missing_concepts: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        comment="List of missing concepts or omitted architectural requirements",
    )
    suggestions: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        comment="List of actionable recommendations for improvement",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        comment="Evaluation timestamp (UTC)",
    )

    answer: Mapped["CandidateAnswerModel"] = relationship(
        "CandidateAnswerModel",
        back_populates="evaluation",
    )
    session: Mapped["InterviewSessionModel"] = relationship(
        "InterviewSessionModel",
    )


class FollowUpQuestionModel(Base):
    """Database model persisting adaptive follow-up questions and candidate answers."""
    __tablename__ = "follow_up_questions"

    id: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
        default=lambda: f"fq-{uuid.uuid4().hex[:12]}",
        comment="Unique follow-up identifier (fq-xxxx)",
    )
    session_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key referencing interview_sessions.id",
    )
    primary_question_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        index=True,
        comment="Primary question index (1-based)",
    )
    follow_up_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        comment="Follow-up index (1 or 2)",
    )
    question_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Follow-up probing question text generated by Gemini",
    )
    expected_concepts: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        comment="Expected architectural or algorithmic concepts",
    )
    probing_reason: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Reasoning for this follow-up based on prior answer / evaluation",
    )
    candidate_answer: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Candidate's submitted response to this follow-up question",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        comment="Follow-up creation timestamp (UTC)",
    )
    answered_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        comment="Timestamp when candidate answered this follow-up",
    )

    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "primary_question_number",
            "follow_up_number",
            name="uq_follow_up_session_question_number",
        ),
    )

    session: Mapped["InterviewSessionModel"] = relationship(
        "InterviewSessionModel",
        back_populates="follow_ups",
    )


class PrimaryQuestionModel(Base):
    """Database model persisting primary technical interview questions and their sequence."""
    __tablename__ = "primary_questions"

    id: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
        default=lambda: f"pq-{uuid.uuid4().hex[:12]}",
        comment="Unique primary question identifier (pq-xxxx)",
    )
    session_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
        comment="Foreign key referencing interview_sessions.id",
    )
    question_number: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=1,
        index=True,
        comment="Primary question index within session (1-based)",
    )
    topic: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
        comment="Technical topic or domain",
    )
    difficulty: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        comment="Seniority level (Junior, Mid, Senior, Staff)",
    )
    question_text: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Problem statement and scenario",
    )
    starter_code: Mapped[Optional[str]] = mapped_column(
        Text,
        nullable=True,
        comment="Optional starter code stub or signature",
    )
    expected_concepts: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        comment="List of expected architectural or algorithmic concepts",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        comment="Timestamp when question was generated (UTC)",
    )

    __table_args__ = (
        UniqueConstraint(
            "session_id",
            "question_number",
            name="uq_primary_question_session_number",
        ),
    )

    session: Mapped["InterviewSessionModel"] = relationship(
        "InterviewSessionModel",
        back_populates="primary_questions",
    )


class InterviewReportModel(Base):
    """Database model persisting final aggregated interview performance reports."""
    __tablename__ = "interview_reports"

    id: Mapped[str] = mapped_column(
        String(50),
        primary_key=True,
        default=lambda: f"rep-{uuid.uuid4().hex[:12]}",
        comment="Unique report identifier (rep-xxxx)",
    )
    session_id: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("interview_sessions.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
        comment="1-to-1 foreign key referencing interview_sessions.id",
    )
    overall_score: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Backend-calculated weighted overall score across all questions (0.0 - 10.0)",
    )
    correctness_average: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Average correctness score across evaluated questions (0.0 - 10.0)",
    )
    technical_depth_average: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Average technical depth score across evaluated questions (0.0 - 10.0)",
    )
    edge_cases_average: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Average edge cases score across evaluated questions (0.0 - 10.0)",
    )
    communication_average: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
        comment="Average communication clarity score across evaluated questions (0.0 - 10.0)",
    )
    total_questions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=5,
        comment="Configured primary question count",
    )
    answered_questions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of questions candidate submitted an answer for",
    )
    evaluated_questions: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0,
        comment="Number of questions with completed AI evaluations",
    )
    performance_rating: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="Not Evaluated",
        comment="Categorical performance tier (e.g. Excellent, Proficient, Developing, Needs Improvement)",
    )
    summary_narrative: Mapped[str] = mapped_column(
        Text,
        nullable=False,
        comment="Qualitative narrative executive summary of interview performance",
    )
    strengths: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        comment="Deduplicated list of demonstrated candidate strengths",
    )
    improvement_areas: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        comment="Deduplicated list of identified areas for growth or missing concepts",
    )
    study_recommendations: Mapped[list[str]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        comment="Actionable study recommendations and architectural topics",
    )
    per_question_results: Mapped[list[dict]] = mapped_column(
        JSON,
        nullable=False,
        default=list,
        comment="Detailed JSON array of per-question prompts, answers, scores, and follow-ups",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        comment="Report creation timestamp (UTC)",
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        comment="Report last updated timestamp (UTC)",
    )

    session: Mapped["InterviewSessionModel"] = relationship(
        "InterviewSessionModel",
        back_populates="report",
    )
