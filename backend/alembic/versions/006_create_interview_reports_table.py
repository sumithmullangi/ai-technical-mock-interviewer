"""create_interview_reports_table

Revision ID: 006_interview_reports
Revises: 005_primary_questions
Create Date: 2026-10-21 17:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '006_interview_reports'
down_revision: Union[str, Sequence[str], None] = '005_primary_questions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the interview_reports table."""
    op.create_table(
        'interview_reports',
        sa.Column('id', sa.String(length=50), nullable=False, comment='Unique report identifier (rep-xxxx)'),
        sa.Column(
            'session_id',
            sa.String(length=50),
            sa.ForeignKey('interview_sessions.id', ondelete='CASCADE'),
            nullable=False,
            unique=True,
            comment='1-to-1 foreign key referencing interview_sessions.id',
        ),
        sa.Column('overall_score', sa.Float(), nullable=True, comment='Backend-calculated weighted overall score (0.0 - 10.0)'),
        sa.Column('correctness_average', sa.Float(), nullable=True, comment='Average correctness score (0.0 - 10.0)'),
        sa.Column('technical_depth_average', sa.Float(), nullable=True, comment='Average technical depth score (0.0 - 10.0)'),
        sa.Column('edge_cases_average', sa.Float(), nullable=True, comment='Average edge cases score (0.0 - 10.0)'),
        sa.Column('communication_average', sa.Float(), nullable=True, comment='Average communication clarity score (0.0 - 10.0)'),
        sa.Column('total_questions', sa.Integer(), nullable=False, server_default='5', comment='Configured question count'),
        sa.Column('answered_questions', sa.Integer(), nullable=False, server_default='0', comment='Answered question count'),
        sa.Column('evaluated_questions', sa.Integer(), nullable=False, server_default='0', comment='Evaluated question count'),
        sa.Column('performance_rating', sa.String(length=50), nullable=False, server_default='Not Evaluated', comment='Categorical rating tier'),
        sa.Column('summary_narrative', sa.Text(), nullable=False, comment='Narrative executive performance summary'),
        sa.Column('strengths', sa.JSON(), nullable=False, comment='List of candidate strengths'),
        sa.Column('improvement_areas', sa.JSON(), nullable=False, comment='List of missing concepts or growth areas'),
        sa.Column('study_recommendations', sa.JSON(), nullable=False, comment='Actionable study recommendations'),
        sa.Column('per_question_results', sa.JSON(), nullable=False, comment='Detailed question prompts, answers, scores, and follow-ups'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_interview_reports_session_id'), 'interview_reports', ['session_id'], unique=True)


def downgrade() -> None:
    """Drop the interview_reports table."""
    op.drop_index(op.f('ix_interview_reports_session_id'), table_name='interview_reports')
    op.drop_table('interview_reports')
