"""create_primary_questions_table

Revision ID: 005_primary_questions
Revises: 004_follow_up_questions
Create Date: 2026-10-21 16:25:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '005_primary_questions'
down_revision: Union[str, Sequence[str], None] = '004_follow_up_questions'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the primary_questions table."""
    op.create_table(
        'primary_questions',
        sa.Column('id', sa.String(length=50), nullable=False, comment='Unique primary question identifier (pq-xxxx)'),
        sa.Column(
            'session_id',
            sa.String(length=50),
            sa.ForeignKey('interview_sessions.id', ondelete='CASCADE'),
            nullable=False,
            comment='Foreign key referencing interview_sessions.id',
        ),
        sa.Column('question_number', sa.Integer(), nullable=False, server_default='1', comment='Primary question index within session (1-based)'),
        sa.Column('topic', sa.String(length=150), nullable=False, comment='Technical topic or domain'),
        sa.Column('difficulty', sa.String(length=20), nullable=False, comment='Seniority level (Junior, Mid, Senior, Staff)'),
        sa.Column('question_text', sa.Text(), nullable=False, comment='Problem statement and scenario'),
        sa.Column('starter_code', sa.Text(), nullable=True, comment='Optional starter code stub or signature'),
        sa.Column('expected_concepts', sa.JSON(), nullable=False, comment='List of expected architectural or algorithmic concepts'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, comment='Timestamp when question was generated (UTC)'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('session_id', 'question_number', name='uq_primary_question_session_number'),
    )
    op.create_index('ix_primary_questions_session_id', 'primary_questions', ['session_id'])
    op.create_index('ix_primary_questions_question_number', 'primary_questions', ['question_number'])


def downgrade() -> None:
    """Drop the primary_questions table."""
    op.drop_index('ix_primary_questions_question_number', table_name='primary_questions')
    op.drop_index('ix_primary_questions_session_id', table_name='primary_questions')
    op.drop_table('primary_questions')
