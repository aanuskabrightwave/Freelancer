"""add_booking_assignments_and_booking_fields

Revision ID: a1b2c3d4e5f6
Revises: b98ac40aed0c
Create Date: 2026-08-31 12:15:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = 'b98ac40aed0c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Update bookings table columns
    op.add_column('bookings', sa.Column('selected_freelancer_profile_id', sa.Integer(), nullable=True))
    op.add_column('bookings', sa.Column('assigned_by_admin_id', sa.Integer(), nullable=True))
    op.add_column('bookings', sa.Column('is_admin_managed', sa.Boolean(), server_default='1', nullable=False))
    op.add_column('bookings', sa.Column('freelancer_payout_amount', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('bookings', sa.Column('admin_notes', sa.Text(), nullable=True))

    # Update MySQL enum for status to include MATCHING_IN_PROGRESS
    op.execute(
        "ALTER TABLE bookings MODIFY COLUMN status "
        "ENUM('REQUESTED', 'MATCHING_IN_PROGRESS', 'PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERY_PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'RESCHEDULE_REQUESTED') "
        "NOT NULL DEFAULT 'REQUESTED'"
    )

    # Make freelancer_profile_id nullable on bookings
    op.alter_column('bookings', 'freelancer_profile_id', existing_type=sa.Integer(), nullable=True)

    # Backfill legacy bookings: mark as not admin managed and copy initial freelancer to selected
    op.execute("UPDATE bookings SET is_admin_managed = 0, selected_freelancer_profile_id = freelancer_profile_id")

    # Add foreign keys and indexes to bookings
    op.create_foreign_key(
        'fk_bookings_selected_freelancer',
        'bookings',
        'freelancer_profiles',
        ['selected_freelancer_profile_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_foreign_key(
        'fk_bookings_assigned_by_admin',
        'bookings',
        'users',
        ['assigned_by_admin_id'],
        ['id'],
        ondelete='SET NULL'
    )
    op.create_index(op.f('ix_bookings_selected_freelancer_profile_id'), 'bookings', ['selected_freelancer_profile_id'], unique=False)
    op.create_index(op.f('ix_bookings_assigned_by_admin_id'), 'bookings', ['assigned_by_admin_id'], unique=False)

    # 2. Create booking_assignments table
    op.create_table(
        'booking_assignments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('freelancer_profile_id', sa.Integer(), nullable=False),
        sa.Column('assigned_by_admin_id', sa.Integer(), nullable=False),
        sa.Column('assignment_round', sa.Integer(), server_default='1', nullable=False),
        sa.Column('status', sa.String(length=50), server_default='OFFERED', nullable=False),
        sa.Column('offered_payout_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('decline_reason', sa.Text(), nullable=True),
        sa.Column('counter_offer_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('counter_offer_notes', sa.Text(), nullable=True),
        sa.Column('is_replacement', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('client_approval_required', sa.Boolean(), server_default='0', nullable=False),
        sa.Column('client_approval_status', sa.String(length=50), server_default='NOT_REQUIRED', nullable=False),
        sa.Column('client_approval_notes', sa.Text(), nullable=True),
        sa.Column('client_responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('offered_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['assigned_by_admin_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['freelancer_profile_id'], ['freelancer_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_booking_assignments_id'), 'booking_assignments', ['id'], unique=False)
    op.create_index(op.f('ix_booking_assignments_booking_id'), 'booking_assignments', ['booking_id'], unique=False)
    op.create_index(op.f('ix_booking_assignments_freelancer_profile_id'), 'booking_assignments', ['freelancer_profile_id'], unique=False)
    op.create_index(op.f('ix_booking_assignments_status'), 'booking_assignments', ['status'], unique=False)


def downgrade() -> None:
    try:
        op.drop_table('booking_assignments')
    except Exception:
        pass

    # Drop FK constraints safely before indexes in MySQL
    try:
        op.drop_constraint('fk_bookings_assigned_by_admin', 'bookings', type_='foreignkey')
    except Exception:
        pass

    try:
        op.drop_constraint('fk_bookings_selected_freelancer', 'bookings', type_='foreignkey')
    except Exception:
        pass

    try:
        op.drop_index(op.f('ix_bookings_assigned_by_admin_id'), table_name='bookings')
    except Exception:
        pass

    try:
        op.drop_index(op.f('ix_bookings_selected_freelancer_profile_id'), table_name='bookings')
    except Exception:
        pass

    # Ensure all bookings have a non-null freelancer_profile_id before re-enforcing NOT NULL
    try:
        op.execute("UPDATE bookings SET freelancer_profile_id = selected_freelancer_profile_id WHERE freelancer_profile_id IS NULL AND selected_freelancer_profile_id IS NOT NULL")
        op.execute("DELETE FROM bookings WHERE freelancer_profile_id IS NULL")
    except Exception:
        pass

    try:
        op.alter_column('bookings', 'freelancer_profile_id', existing_type=sa.Integer(), nullable=False)
    except Exception:
        pass

    # Revert MATCHING_IN_PROGRESS bookings to REQUESTED before reverting enum definition
    try:
        op.execute("UPDATE bookings SET status = 'REQUESTED' WHERE status = 'MATCHING_IN_PROGRESS'")
    except Exception:
        pass

    try:
        op.execute(
            "ALTER TABLE bookings MODIFY COLUMN status "
            "ENUM('REQUESTED', 'PENDING_CONFIRMATION', 'CONFIRMED', 'IN_PROGRESS', 'DELIVERY_PENDING', 'COMPLETED', 'REJECTED', 'CANCELLED', 'RESCHEDULE_REQUESTED') "
            "NOT NULL DEFAULT 'REQUESTED'"
        )
    except Exception:
        pass

    try:
        op.drop_column('bookings', 'admin_notes')
    except Exception:
        pass

    try:
        op.drop_column('bookings', 'freelancer_payout_amount')
    except Exception:
        pass

    try:
        op.drop_column('bookings', 'is_admin_managed')
    except Exception:
        pass

    try:
        op.drop_column('bookings', 'assigned_by_admin_id')
    except Exception:
        pass

    try:
        op.drop_column('bookings', 'selected_freelancer_profile_id')
    except Exception:
        pass
