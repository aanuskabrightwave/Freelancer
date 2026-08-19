"""add_two_stage_payment_and_dispute_fields

Revision ID: 5cd117098c69
Revises: b7fec4d7cf69
Create Date: 2026-08-17 14:57:59.836067

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5cd117098c69'
down_revision: Union[str, None] = 'b7fec4d7cf69'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Add fields to bookings table
    op.add_column("bookings", sa.Column("deposit_amount", sa.Numeric(10, 2), server_default="0.00", nullable=False))
    op.add_column("bookings", sa.Column("deposit_paid_amount", sa.Numeric(10, 2), server_default="0.00", nullable=False))
    op.add_column("bookings", sa.Column("remaining_balance", sa.Numeric(10, 2), server_default="0.00", nullable=False))
    op.add_column("bookings", sa.Column("total_paid", sa.Numeric(10, 2), server_default="0.00", nullable=False))
    op.add_column("bookings", sa.Column("payment_completion_state", sa.String(50), server_default="UNPAID", nullable=False))
    op.add_column("bookings", sa.Column("final_approved_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("bookings", sa.Column("dispute_window_ends_at", sa.DateTime(timezone=True), nullable=True))

    # 2. Add field to payments table
    op.add_column("payments", sa.Column("payment_type", sa.String(50), server_default="FULL", nullable=False))


def downgrade() -> None:
    op.drop_column("payments", "payment_type")
    
    op.drop_column("bookings", "dispute_window_ends_at")
    op.drop_column("bookings", "final_approved_at")
    op.drop_column("bookings", "payment_completion_state")
    op.drop_column("bookings", "total_paid")
    op.drop_column("bookings", "remaining_balance")
    op.drop_column("bookings", "deposit_paid_amount")
    op.drop_column("bookings", "deposit_amount")
