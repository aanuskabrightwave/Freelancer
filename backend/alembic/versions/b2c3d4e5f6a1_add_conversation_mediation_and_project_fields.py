"""add_conversation_mediation_and_project_fields

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-08-31 12:20:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a1'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update conversations table
    op.add_column('conversations', sa.Column('conversation_type', sa.String(length=50), server_default='DIRECT_LEGACY', nullable=False))
    op.add_column('conversations', sa.Column('admin_id', sa.Integer(), nullable=True))
    op.add_column('conversations', sa.Column('project_id', sa.Integer(), nullable=True))
    
    op.alter_column('conversations', 'client_id', existing_type=sa.Integer(), nullable=True)
    op.alter_column('conversations', 'freelancer_id', existing_type=sa.Integer(), nullable=True)

    # Backfill all existing conversations as DIRECT_LEGACY
    op.execute("UPDATE conversations SET conversation_type = 'DIRECT_LEGACY'")

    op.create_foreign_key('fk_conversations_admin', 'conversations', 'users', ['admin_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key('fk_conversations_project', 'conversations', 'projects', ['project_id'], ['id'], ondelete='CASCADE')
    
    op.create_index(op.f('ix_conversations_conversation_type'), 'conversations', ['conversation_type'], unique=False)
    op.create_index(op.f('ix_conversations_admin_id'), 'conversations', ['admin_id'], unique=False)
    op.create_index(op.f('ix_conversations_project_id'), 'conversations', ['project_id'], unique=False)

    # 2. Update projects table
    op.add_column('projects', sa.Column('is_admin_managed', sa.Boolean(), server_default='1', nullable=False))
    op.add_column('projects', sa.Column('admin_reviewed_by_id', sa.Integer(), nullable=True))
    op.add_column('projects', sa.Column('admin_review_notes', sa.Text(), nullable=True))

    # Backfill existing projects as not admin managed (legacy)
    op.execute("UPDATE projects SET is_admin_managed = 0")

    op.create_foreign_key('fk_projects_admin_reviewer', 'projects', 'users', ['admin_reviewed_by_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_projects_admin_reviewed_by_id'), 'projects', ['admin_reviewed_by_id'], unique=False)


def downgrade() -> None:
    # Drop FK constraints safely before indexes in MySQL
    try:
        op.drop_constraint('fk_projects_admin_reviewer', 'projects', type_='foreignkey')
    except Exception:
        pass

    try:
        op.drop_index(op.f('ix_projects_admin_reviewed_by_id'), table_name='projects')
    except Exception:
        pass

    try:
        op.drop_column('projects', 'admin_review_notes')
    except Exception:
        pass

    try:
        op.drop_column('projects', 'admin_reviewed_by_id')
    except Exception:
        pass

    try:
        op.drop_column('projects', 'is_admin_managed')
    except Exception:
        pass

    try:
        op.drop_constraint('fk_conversations_project', 'conversations', type_='foreignkey')
    except Exception:
        pass

    try:
        op.drop_constraint('fk_conversations_admin', 'conversations', type_='foreignkey')
    except Exception:
        pass

    try:
        op.drop_index(op.f('ix_conversations_project_id'), table_name='conversations')
    except Exception:
        pass

    try:
        op.drop_index(op.f('ix_conversations_admin_id'), table_name='conversations')
    except Exception:
        pass

    try:
        op.drop_index(op.f('ix_conversations_conversation_type'), table_name='conversations')
    except Exception:
        pass
    
    # Remove mediated/partitioned conversations that have NULL client_id or freelancer_id before re-enforcing NOT NULL
    try:
        op.execute("DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE client_id IS NULL OR freelancer_id IS NULL)")
        op.execute("DELETE FROM conversations WHERE client_id IS NULL OR freelancer_id IS NULL")
    except Exception:
        pass

    try:
        op.alter_column('conversations', 'freelancer_id', existing_type=sa.Integer(), nullable=False)
    except Exception:
        pass

    try:
        op.alter_column('conversations', 'client_id', existing_type=sa.Integer(), nullable=False)
    except Exception:
        pass

    try:
        op.drop_column('conversations', 'project_id')
    except Exception:
        pass

    try:
        op.drop_column('conversations', 'admin_id')
    except Exception:
        pass

    try:
        op.drop_column('conversations', 'conversation_type')
    except Exception:
        pass
