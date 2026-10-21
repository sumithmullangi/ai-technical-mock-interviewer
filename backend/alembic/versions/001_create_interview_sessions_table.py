"""create_interview_sessions_table

Revision ID: 001_interview_sessions
Revises: 
Create Date: 2026-10-21 14:16:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '001_interview_sessions'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the initial interview_sessions table."""
    op.create_table(
        'interview_sessions',
        sa.Column('id', sa.String(length=50), nullable=False, comment='Unique session identifier (mock-xxxx)'),
        sa.Column('role', sa.String(length=100), nullable=False, comment='Target engineering role'),
        sa.Column('difficulty', sa.String(length=20), nullable=False, server_default='Senior', comment='Seniority level (Junior, Mid, Senior, Staff)'),
        sa.Column('primary_language', sa.String(length=20), nullable=False, server_default='Python', comment='Primary programming language'),
        sa.Column('question_count', sa.Integer(), nullable=False, server_default='5', comment='Configured primary question count (3-10)'),
        sa.Column('status', sa.String(length=30), nullable=False, server_default='configured', comment='Lifecycle status (configured, in_progress, completed)'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, comment='Session creation timestamp (UTC)'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Drop the interview_sessions table."""
    op.drop_table('interview_sessions')
