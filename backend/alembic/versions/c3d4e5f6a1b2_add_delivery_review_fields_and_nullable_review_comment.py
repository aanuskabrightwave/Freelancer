"""add_delivery_review_fields_and_nullable_review_comment

Revision ID: c3d4e5f6a1b2
Revises: b2c3d4e5f6a1
Create Date: 2026-08-31 12:25:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a1b2'
down_revision: Union[str, None] = 'b2c3d4e5f6a1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update deliveries table
    op.add_column('deliveries', sa.Column('admin_review_status', sa.String(length=50), server_default='PENDING', nullable=False))
    op.add_column('deliveries', sa.Column('admin_reviewed_by_id', sa.Integer(), nullable=True))
    op.add_column('deliveries', sa.Column('admin_reviewed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('deliveries', sa.Column('admin_feedback_to_freelancer', sa.Text(), nullable=True))
    op.add_column('deliveries', sa.Column('shared_with_client_at', sa.DateTime(timezone=True), nullable=True))

    op.create_foreign_key('fk_deliveries_admin_reviewer', 'deliveries', 'users', ['admin_reviewed_by_id'], ['id'], ondelete='SET NULL')
    op.create_index(op.f('ix_deliveries_admin_reviewed_by_id'), 'deliveries', ['admin_reviewed_by_id'], unique=False)
    op.create_index(op.f('ix_deliveries_admin_review_status'), 'deliveries', ['admin_review_status'], unique=False)

    # 2. Update reviews table: make comment nullable
    op.alter_column('reviews', 'comment', existing_type=sa.Text(), nullable=True)


def downgrade() -> None:
    # Backfill any null comments with empty string before enforcing NOT NULL constraint
    op.execute("UPDATE reviews SET comment = '' WHERE comment IS NULL")
    op.alter_column('reviews', 'comment', existing_type=sa.Text(), nullable=False)

    # Drop FK constraints safely before indexes/columns in MySQL
    try:
        op.drop_constraint('fk_deliveries_admin_reviewer', 'deliveries', type_='foreignkey')
    except Exception:
        pass

    try:
        op.drop_index(op.f('ix_deliveries_admin_reviewed_by_id'), table_name='deliveries')
    except Exception:
        pass

    try:
        op.drop_index(op.f('ix_deliveries_admin_review_status'), table_name='deliveries')
    except Exception:
        pass

    op.drop_column('deliveries', 'shared_with_client_at')
    op.drop_column('deliveries', 'admin_feedback_to_freelancer')
    op.drop_column('deliveries', 'admin_reviewed_at')
    op.drop_column('deliveries', 'admin_reviewed_by_id')
    op.drop_column('deliveries', 'admin_review_status')
