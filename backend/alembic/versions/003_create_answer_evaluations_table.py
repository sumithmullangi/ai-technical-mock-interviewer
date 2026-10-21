"""create_answer_evaluations_table

Revision ID: 003_answer_evaluations
Revises: 002_candidate_answers
Create Date: 2026-10-21 15:47:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '003_answer_evaluations'
down_revision: Union[str, Sequence[str], None] = '002_candidate_answers'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the answer_evaluations table."""
    op.create_table(
        'answer_evaluations',
        sa.Column('id', sa.String(length=50), nullable=False, comment='Unique evaluation identifier (eval-xxxx)'),
        sa.Column(
            'answer_id',
            sa.String(length=50),
            sa.ForeignKey('candidate_answers.id', ondelete='CASCADE'),
            nullable=False,
            comment='1-to-1 foreign key referencing candidate_answers.id',
        ),
        sa.Column(
            'session_id',
            sa.String(length=50),
            sa.ForeignKey('interview_sessions.id', ondelete='CASCADE'),
            nullable=False,
            comment='Associated interview session ID',
        ),
        sa.Column('correctness_score', sa.Float(), nullable=False, comment='Correctness score (0.0 - 10.0, weight 40%)'),
        sa.Column('technical_depth_score', sa.Float(), nullable=False, comment='Technical depth score (0.0 - 10.0, weight 25%)'),
        sa.Column('edge_cases_score', sa.Float(), nullable=False, comment='Edge cases score (0.0 - 10.0, weight 20%)'),
        sa.Column('communication_score', sa.Float(), nullable=False, comment='Communication clarity score (0.0 - 10.0, weight 15%)'),
        sa.Column('overall_score', sa.Float(), nullable=False, comment='Backend-calculated weighted overall score (0.0 - 10.0)'),
        sa.Column('feedback', sa.Text(), nullable=False, comment='Concise qualitative summary of the candidate performance'),
        sa.Column('strengths', sa.JSON(), nullable=False, comment='List of candidate key technical strengths'),
        sa.Column('missing_concepts', sa.JSON(), nullable=False, comment='List of missing concepts or omitted architectural requirements'),
        sa.Column('suggestions', sa.JSON(), nullable=False, comment='List of actionable recommendations for improvement'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, comment='Evaluation timestamp (UTC)'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('answer_id', name='uq_answer_evaluations_answer_id'),
    )
    op.create_index('ix_answer_evaluations_answer_id', 'answer_evaluations', ['answer_id'], unique=True)
    op.create_index('ix_answer_evaluations_session_id', 'answer_evaluations', ['session_id'])


def downgrade() -> None:
    """Drop the answer_evaluations table."""
    op.drop_index('ix_answer_evaluations_session_id', table_name='answer_evaluations')
    op.drop_index('ix_answer_evaluations_answer_id', table_name='answer_evaluations')
    op.drop_table('answer_evaluations')
