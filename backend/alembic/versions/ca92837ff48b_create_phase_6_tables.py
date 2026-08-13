"""create_phase_6_tables

Revision ID: ca92837ff48b
Revises: 3c9a62efd48e
Create Date: 2026-08-13 17:39:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision: str = 'ca92837ff48b'
down_revision: Union[str, None] = '3c9a62efd48e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. Create projects table
    op.create_table(
        'projects',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('project_type', sa.String(length=50), nullable=False),
        sa.Column('budget', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('state', sa.String(length=100), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['client_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_projects_id'), 'projects', ['id'], unique=False)
    op.create_index(op.f('ix_projects_client_id'), 'projects', ['client_id'], unique=False)

    # 2. Create proposals table
    op.create_table(
        'proposals',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('project_id', sa.Integer(), nullable=False),
        sa.Column('freelancer_profile_id', sa.Integer(), nullable=False),
        sa.Column('proposed_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('cover_letter', sa.Text(), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['project_id'], ['projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['freelancer_profile_id'], ['freelancer_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_proposals_id'), 'proposals', ['id'], unique=False)
    op.create_index(op.f('ix_proposals_project_id'), 'proposals', ['project_id'], unique=False)
    op.create_index(op.f('ix_proposals_freelancer_profile_id'), 'proposals', ['freelancer_profile_id'], unique=False)

    # 3. Add columns to bookings
    # Make service_id and service_package_id nullable first
    op.alter_column('bookings', 'service_id', existing_type=sa.Integer(), nullable=True)
    op.alter_column('bookings', 'service_package_id', existing_type=sa.Integer(), nullable=True)

    op.add_column('bookings', sa.Column('booking_number', sa.String(length=50), nullable=True))
    op.add_column('bookings', sa.Column('source_type', sa.String(length=50), nullable=True))
    op.add_column('bookings', sa.Column('project_id', sa.Integer(), nullable=True))
    op.add_column('bookings', sa.Column('proposal_id', sa.Integer(), nullable=True))
    op.add_column('bookings', sa.Column('title', sa.String(length=255), nullable=True))
    op.add_column('bookings', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('bookings', sa.Column('booking_type', sa.String(length=50), nullable=True))
    op.add_column('bookings', sa.Column('scheduled_date', sa.Date(), nullable=True))
    op.add_column('bookings', sa.Column('start_time', sa.Time(), nullable=True))
    op.add_column('bookings', sa.Column('end_time', sa.Time(), nullable=True))
    op.add_column('bookings', sa.Column('timezone', sa.String(length=50), nullable=True))
    op.add_column('bookings', sa.Column('expected_duration_hours', sa.Integer(), nullable=True))
    op.add_column('bookings', sa.Column('delivery_deadline', sa.DateTime(timezone=True), nullable=True))
    op.add_column('bookings', sa.Column('location_city', sa.String(length=100), nullable=True))
    op.add_column('bookings', sa.Column('location_state', sa.String(length=100), nullable=True))
    op.add_column('bookings', sa.Column('location_country', sa.String(length=100), nullable=True))
    op.add_column('bookings', sa.Column('venue_name', sa.String(length=255), nullable=True))
    op.add_column('bookings', sa.Column('venue_address', sa.Text(), nullable=True))
    op.add_column('bookings', sa.Column('agreed_amount', sa.Numeric(precision=10, scale=2), nullable=True))
    op.add_column('bookings', sa.Column('currency', sa.String(length=10), nullable=True))
    op.add_column('bookings', sa.Column('cancellation_reason', sa.Text(), nullable=True))
    op.add_column('bookings', sa.Column('cancelled_by', sa.String(length=50), nullable=True))
    op.add_column('bookings', sa.Column('confirmed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('bookings', sa.Column('started_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('bookings', sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('bookings', sa.Column('cancelled_at', sa.DateTime(timezone=True), nullable=True))

    # Populate temporary booking_number so we can make it unique/not-null later
    # (Since we are in development and SQLite/MySQL is clean, we can just enforce not-null directly on fresh runs)
    # Write ForeignKey constraints for new relations
    op.create_foreign_key('fk_bookings_project_id', 'bookings', 'projects', ['project_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('fk_bookings_proposal_id', 'bookings', 'proposals', ['proposal_id'], ['id'], ondelete='CASCADE')

    op.create_index(op.f('ix_bookings_booking_number'), 'bookings', ['booking_number'], unique=True)
    op.create_index(op.f('ix_bookings_scheduled_date'), 'bookings', ['scheduled_date'], unique=False)
    op.create_index(op.f('ix_bookings_project_id'), 'bookings', ['project_id'], unique=False)

    # 4. Create booking_requirement_answers table
    op.create_table(
        'booking_requirement_answers',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('service_requirement_id', sa.Integer(), nullable=False),
        sa.Column('answer_text', sa.Text(), nullable=True),
        sa.Column('answer_number', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('answer_date', sa.Date(), nullable=True),
        sa.Column('answer_boolean', sa.Boolean(), nullable=True),
        sa.Column('file_url', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['service_requirement_id'], ['service_requirements.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_booking_requirement_answers_booking_id'), 'booking_requirement_answers', ['booking_id'], unique=False)
    op.create_index(op.f('ix_booking_requirement_answers_id'), 'booking_requirement_answers', ['id'], unique=False)

    # 5. Create freelancer_weekly_schedules table
    op.create_table(
        'freelancer_weekly_schedules',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('freelancer_profile_id', sa.Integer(), nullable=False),
        sa.Column('day_of_week', sa.String(length=20), nullable=False),
        sa.Column('is_available', sa.Boolean(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=False),
        sa.Column('end_time', sa.Time(), nullable=False),
        sa.ForeignKeyConstraint(['freelancer_profile_id'], ['freelancer_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('freelancer_profile_id', 'day_of_week', name='uq_freelancer_day')
    )
    op.create_index(op.f('ix_freelancer_weekly_schedules_freelancer_profile_id'), 'freelancer_weekly_schedules', ['freelancer_profile_id'], unique=False)
    op.create_index(op.f('ix_freelancer_weekly_schedules_id'), 'freelancer_weekly_schedules', ['id'], unique=False)

    # 6. Create freelancer_availabilities table
    op.create_table(
        'freelancer_availabilities',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('freelancer_profile_id', sa.Integer(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('start_time', sa.Time(), nullable=True),
        sa.Column('end_time', sa.Time(), nullable=True),
        sa.Column('availability_type', sa.String(length=50), nullable=False),
        sa.Column('note', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['freelancer_profile_id'], ['freelancer_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_freelancer_availabilities_freelancer_profile_id'), 'freelancer_availabilities', ['freelancer_profile_id'], unique=False)
    op.create_index(op.f('ix_freelancer_availabilities_date'), 'freelancer_availabilities', ['date'], unique=False)
    op.create_index(op.f('ix_freelancer_availabilities_id'), 'freelancer_availabilities', ['id'], unique=False)

    # 7. Create booking_reschedule_requests table
    op.create_table(
        'booking_reschedule_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('requested_by', sa.String(length=50), nullable=False),
        sa.Column('old_date', sa.Date(), nullable=True),
        sa.Column('old_start_time', sa.Time(), nullable=True),
        sa.Column('old_end_time', sa.Time(), nullable=True),
        sa.Column('new_date', sa.Date(), nullable=False),
        sa.Column('new_start_time', sa.Time(), nullable=True),
        sa.Column('new_end_time', sa.Time(), nullable=True),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('responded_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_booking_reschedule_requests_booking_id'), 'booking_reschedule_requests', ['booking_id'], unique=False)
    op.create_index(op.f('ix_booking_reschedule_requests_id'), 'booking_reschedule_requests', ['id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_booking_reschedule_requests_id'), table_name='booking_reschedule_requests')
    op.drop_index(op.f('ix_booking_reschedule_requests_booking_id'), table_name='booking_reschedule_requests')
    op.drop_table('booking_reschedule_requests')

    op.drop_index(op.f('ix_freelancer_availabilities_id'), table_name='freelancer_availabilities')
    op.drop_index(op.f('ix_freelancer_availabilities_date'), table_name='freelancer_availabilities')
    op.drop_index(op.f('ix_freelancer_availabilities_freelancer_profile_id'), table_name='freelancer_availabilities')
    op.drop_table('freelancer_availabilities')

    op.drop_index(op.f('ix_freelancer_weekly_schedules_id'), table_name='freelancer_weekly_schedules')
    op.drop_index(op.f('ix_freelancer_weekly_schedules_freelancer_profile_id'), table_name='freelancer_weekly_schedules')
    op.drop_table('freelancer_weekly_schedules')

    op.drop_index(op.f('ix_booking_requirement_answers_id'), table_name='booking_requirement_answers')
    op.drop_index(op.f('ix_booking_requirement_answers_booking_id'), table_name='booking_requirement_answers')
    op.drop_table('booking_requirement_answers')

    op.drop_index(op.f('ix_bookings_project_id'), table_name='bookings')
    op.drop_index(op.f('ix_bookings_scheduled_date'), table_name='bookings')
    op.drop_index(op.f('ix_bookings_booking_number'), table_name='bookings')

    op.drop_constraint('fk_bookings_project_id', 'bookings', type_='foreignkey')
    op.drop_constraint('fk_bookings_proposal_id', 'bookings', type_='foreignkey')

    op.drop_column('bookings', 'cancelled_at')
    op.drop_column('bookings', 'completed_at')
    op.drop_column('bookings', 'started_at')
    op.drop_column('bookings', 'confirmed_at')
    op.drop_column('bookings', 'cancelled_by')
    op.drop_column('bookings', 'cancellation_reason')
    op.drop_column('bookings', 'currency')
    op.drop_column('bookings', 'agreed_amount')
    op.drop_column('bookings', 'venue_address')
    op.drop_column('bookings', 'venue_name')
    op.drop_column('bookings', 'location_country')
    op.drop_column('bookings', 'location_state')
    op.drop_column('bookings', 'location_city')
    op.drop_column('bookings', 'delivery_deadline')
    op.drop_column('bookings', 'expected_duration_hours')
    op.drop_column('bookings', 'timezone')
    op.drop_column('bookings', 'end_time')
    op.drop_column('bookings', 'start_time')
    op.drop_column('bookings', 'scheduled_date')
    op.drop_column('bookings', 'booking_type')
    op.drop_column('bookings', 'description')
    op.drop_column('bookings', 'title')
    op.drop_column('bookings', 'proposal_id')
    op.drop_column('bookings', 'project_id')
    op.drop_column('bookings', 'source_type')
    op.drop_column('bookings', 'booking_number')

    op.alter_column('bookings', 'service_package_id', existing_type=sa.Integer(), nullable=False)
    op.alter_column('bookings', 'service_id', existing_type=sa.Integer(), nullable=False)

    op.drop_index(op.f('ix_proposals_freelancer_profile_id'), table_name='proposals')
    op.drop_index(op.f('ix_proposals_project_id'), table_name='proposals')
    op.drop_index(op.f('ix_proposals_id'), table_name='proposals')
    op.drop_table('proposals')

    op.drop_index(op.f('ix_projects_client_id'), table_name='projects')
    op.drop_index(op.f('ix_projects_id'), table_name='projects')
    op.drop_table('projects')
