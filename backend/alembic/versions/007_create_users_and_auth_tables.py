"""create_users_and_auth_tables

Revision ID: 007_auth_and_user_ownership
Revises: 006_interview_reports
Create Date: 2026-10-21 22:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '007_auth_and_user_ownership'
down_revision: Union[str, Sequence[str], None] = '006_interview_reports'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create users, user_sessions, and password_reset_tokens tables, and add user_id to interview_sessions."""
    # 1. Create users table
    op.create_table(
        'users',
        sa.Column('id', sa.String(length=50), nullable=False, comment='Unique user identifier (usr-xxxx)'),
        sa.Column('email', sa.String(length=255), nullable=False, comment='Normalized unique email address'),
        sa.Column('full_name', sa.String(length=100), nullable=False, comment='Candidate full name'),
        sa.Column('hashed_password', sa.String(length=255), nullable=False, comment='Argon2id password hash'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true'), comment='Whether the account is active'),
        sa.Column('is_verified', sa.Boolean(), nullable=False, server_default=sa.text('false'), comment='Whether email is verified'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)

    # 2. Create user_sessions table
    op.create_table(
        'user_sessions',
        sa.Column('id', sa.String(length=50), nullable=False, comment='Unique session identifier (sess-xxxx)'),
        sa.Column(
            'user_id',
            sa.String(length=50),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
            comment='Foreign key referencing users.id',
        ),
        sa.Column('token_hash', sa.String(length=128), nullable=False, comment='SHA-256 hash of the session token'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False, comment='Session expiration timestamp (UTC)'),
        sa.Column('is_revoked', sa.Boolean(), nullable=False, server_default=sa.text('false'), comment='Whether session was revoked'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('revoked_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('user_agent', sa.String(length=255), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_user_sessions_user_id'), 'user_sessions', ['user_id'], unique=False)
    op.create_index(op.f('ix_user_sessions_token_hash'), 'user_sessions', ['token_hash'], unique=True)

    # 3. Create password_reset_tokens table
    op.create_table(
        'password_reset_tokens',
        sa.Column('id', sa.String(length=50), nullable=False, comment='Unique reset record identifier (rst-xxxx)'),
        sa.Column(
            'user_id',
            sa.String(length=50),
            sa.ForeignKey('users.id', ondelete='CASCADE'),
            nullable=False,
            comment='Foreign key referencing users.id',
        ),
        sa.Column('token_hash', sa.String(length=128), nullable=False, comment='SHA-256 hash of the reset token'),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False, comment='Expiration timestamp (UTC)'),
        sa.Column('is_used', sa.Boolean(), nullable=False, server_default=sa.text('false'), comment='Whether token was consumed'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_password_reset_tokens_user_id'), 'password_reset_tokens', ['user_id'], unique=False)
    op.create_index(op.f('ix_password_reset_tokens_token_hash'), 'password_reset_tokens', ['token_hash'], unique=True)

    # 4. Add nullable user_id to existing interview_sessions table
    op.add_column(
        'interview_sessions',
        sa.Column(
            'user_id',
            sa.String(length=50),
            sa.ForeignKey('users.id', ondelete='SET NULL'),
            nullable=True,
            comment='Owner user ID if session was created by an authenticated user',
        ),
    )
    op.create_index(op.f('ix_interview_sessions_user_id'), 'interview_sessions', ['user_id'], unique=False)


def downgrade() -> None:
    """Drop user_id from interview_sessions and drop auth tables."""
    op.drop_index(op.f('ix_interview_sessions_user_id'), table_name='interview_sessions')
    op.drop_column('interview_sessions', 'user_id')

    op.drop_index(op.f('ix_password_reset_tokens_token_hash'), table_name='password_reset_tokens')
    op.drop_index(op.f('ix_password_reset_tokens_user_id'), table_name='password_reset_tokens')
    op.drop_table('password_reset_tokens')

    op.drop_index(op.f('ix_user_sessions_token_hash'), table_name='user_sessions')
    op.drop_index(op.f('ix_user_sessions_user_id'), table_name='user_sessions')
    op.drop_table('user_sessions')

    op.drop_index(op.f('ix_users_email'), table_name='users')
    op.drop_table('users')
