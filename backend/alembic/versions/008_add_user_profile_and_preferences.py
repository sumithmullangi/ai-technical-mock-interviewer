"""add_user_profile_and_preferences

Revision ID: 008_add_user_profile_and_preferences
Revises: 007_auth_and_user_ownership
Create Date: 2026-10-23 20:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '008_user_profile_prefs'
down_revision: Union[str, Sequence[str], None] = '007_auth_and_user_ownership'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add target_role, experience_level, and preferences to users table."""
    op.add_column(
        'users',
        sa.Column(
            'target_role',
            sa.String(length=100),
            nullable=True,
            comment='Preferred professional role / job track',
        ),
    )
    op.add_column(
        'users',
        sa.Column(
            'experience_level',
            sa.String(length=50),
            nullable=True,
            comment='Candidate experience level (Junior, Mid, Senior, Staff)',
        ),
    )
    op.add_column(
        'users',
        sa.Column(
            'preferences',
            sa.JSON(),
            nullable=True,
            server_default=sa.text("'{}'"),
            comment='User application preferences (theme, default_mode, etc.)',
        ),
    )


def downgrade() -> None:
    """Remove target_role, experience_level, and preferences from users table."""
    op.drop_column('users', 'preferences')
    op.drop_column('users', 'experience_level')
    op.drop_column('users', 'target_role')
