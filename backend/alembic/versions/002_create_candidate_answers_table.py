"""create_candidate_answers_table

Revision ID: 002_candidate_answers
Revises: 001_interview_sessions
Create Date: 2026-10-21 15:28:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '002_candidate_answers'
down_revision: Union[str, Sequence[str], None] = '001_interview_sessions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the candidate_answers table."""
    op.create_table(
        'candidate_answers',
        sa.Column('id', sa.String(length=50), nullable=False, comment='Unique answer identifier (ans-xxxx)'),
        sa.Column(
            'session_id',
            sa.String(length=50),
            sa.ForeignKey('interview_sessions.id', ondelete='CASCADE'),
            nullable=False,
            comment='Associated interview session ID',
        ),
        sa.Column('question_number', sa.Integer(), nullable=False, server_default='1', comment='Primary question index (1-based)'),
        sa.Column('answer_text', sa.Text(), nullable=False, comment='Candidate submitted response text or code'),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=False, comment='Answer submission timestamp (UTC)'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index('ix_candidate_answers_session_id', 'candidate_answers', ['session_id'])


def downgrade() -> None:
    """Drop the candidate_answers table."""
    op.drop_index('ix_candidate_answers_session_id', table_name='candidate_answers')
    op.drop_table('candidate_answers')
