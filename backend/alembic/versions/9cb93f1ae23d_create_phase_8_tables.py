"""create_phase_8_tables

Revision ID: 9cb93f1ae23d
Revises: df74811ae23c
Create Date: 2026-08-13 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '9cb93f1ae23d'
down_revision = 'df74811ae23c'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create payments
    op.create_table(
        'payments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('payment_number', sa.String(length=50), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('client_id', sa.Integer(), nullable=False),
        sa.Column('freelancer_profile_id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False, server_default='RAZORPAY'),
        sa.Column('provider_order_id', sa.String(length=100), nullable=False),
        sa.Column('provider_payment_id', sa.String(length=100), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('gross_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('platform_fee_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('freelancer_amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('gateway_fee_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('tax_amount', sa.Numeric(precision=10, scale=2), nullable=True),
        sa.Column('commission_percent_snapshot', sa.Numeric(precision=5, scale=2), nullable=False),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='CREATED'),
        sa.Column('payment_method', sa.String(length=50), nullable=True),
        sa.Column('failure_code', sa.String(length=100), nullable=True),
        sa.Column('failure_description', sa.Text(), nullable=True),
        sa.Column('paid_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['client_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['freelancer_profile_id'], ['freelancer_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('payment_number'),
        sa.UniqueConstraint('provider_order_id'),
        sa.UniqueConstraint('provider_payment_id')
    )
    op.create_index(op.f('ix_payments_id'), 'payments', ['id'], unique=False)
    op.create_index(op.f('ix_payments_booking_id'), 'payments', ['booking_id'], unique=False)
    op.create_index(op.f('ix_payments_client_id'), 'payments', ['client_id'], unique=False)
    op.create_index(op.f('ix_payments_freelancer_profile_id'), 'payments', ['freelancer_profile_id'], unique=False)
    op.create_index(op.f('ix_payments_status'), 'payments', ['status'], unique=False)

    # 2. Create payment_attempts
    op.create_table(
        'payment_attempts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('payment_id', sa.Integer(), nullable=False),
        sa.Column('provider_order_id', sa.String(length=100), nullable=False),
        sa.Column('provider_payment_id', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=False),
        sa.Column('failure_code', sa.String(length=100), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_payment_attempts_id'), 'payment_attempts', ['id'], unique=False)
    op.create_index(op.f('ix_payment_attempts_payment_id'), 'payment_attempts', ['payment_id'], unique=False)

    # 3. Create payment_webhook_events
    op.create_table(
        'payment_webhook_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False),
        sa.Column('provider_event_id', sa.String(length=100), nullable=False),
        sa.Column('event_type', sa.String(length=100), nullable=False),
        sa.Column('payload_hash', sa.String(length=100), nullable=False),
        sa.Column('processed', sa.Boolean(), nullable=False, server_default='0'),
        sa.Column('processing_error', sa.Text(), nullable=True),
        sa.Column('received_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('provider_event_id')
    )
    op.create_index(op.f('ix_payment_webhook_events_id'), 'payment_webhook_events', ['id'], unique=False)
    op.create_index(op.f('ix_payment_webhook_events_provider_event_id'), 'payment_webhook_events', ['provider_event_id'], unique=True)

    # 4. Create refunds
    op.create_table(
        'refunds',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('refund_number', sa.String(length=50), nullable=False),
        sa.Column('payment_id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False, server_default='RAZORPAY'),
        sa.Column('provider_refund_id', sa.String(length=100), nullable=True),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('reason', sa.Text(), nullable=True),
        sa.Column('requested_by', sa.String(length=50), nullable=False, server_default='CLIENT'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='REQUESTED'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('refund_number'),
        sa.UniqueConstraint('provider_refund_id')
    )
    op.create_index(op.f('ix_refunds_id'), 'refunds', ['id'], unique=False)
    op.create_index(op.f('ix_refunds_payment_id'), 'refunds', ['payment_id'], unique=False)
    op.create_index(op.f('ix_refunds_booking_id'), 'refunds', ['booking_id'], unique=False)
    op.create_index(op.f('ix_refunds_status'), 'refunds', ['status'], unique=False)

    # 5. Create freelancer_payout_accounts
    op.create_table(
        'freelancer_payout_accounts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('freelancer_profile_id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False, server_default='RAZORPAY'),
        sa.Column('provider_account_id', sa.String(length=100), nullable=False),
        sa.Column('account_holder_name', sa.String(length=100), nullable=True),
        sa.Column('account_type', sa.String(length=50), nullable=False, server_default='bank_account'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='NOT_CONFIGURED'),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='1'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['freelancer_profile_id'], ['freelancer_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('freelancer_profile_id')
    )
    op.create_index(op.f('ix_freelancer_payout_accounts_id'), 'freelancer_payout_accounts', ['id'], unique=False)

    # 6. Create payouts
    op.create_table(
        'payouts',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('payout_number', sa.String(length=50), nullable=False),
        sa.Column('freelancer_profile_id', sa.Integer(), nullable=False),
        sa.Column('provider', sa.String(length=50), nullable=False, server_default='RAZORPAY'),
        sa.Column('provider_transfer_id', sa.String(length=100), nullable=True),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('failure_reason', sa.Text(), nullable=True),
        sa.Column('initiated_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('processed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['freelancer_profile_id'], ['freelancer_profiles.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('payout_number'),
        sa.UniqueConstraint('provider_transfer_id')
    )
    op.create_index(op.f('ix_payouts_id'), 'payouts', ['id'], unique=False)
    op.create_index(op.f('ix_payouts_freelancer_profile_id'), 'payouts', ['freelancer_profile_id'], unique=False)
    op.create_index(op.f('ix_payouts_status'), 'payouts', ['status'], unique=False)

    # 7. Create ledger_entries
    op.create_table(
        'ledger_entries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=True),
        sa.Column('freelancer_profile_id', sa.Integer(), nullable=True),
        sa.Column('booking_id', sa.Integer(), nullable=True),
        sa.Column('payment_id', sa.Integer(), nullable=True),
        sa.Column('payout_id', sa.Integer(), nullable=True),
        sa.Column('refund_id', sa.Integer(), nullable=True),
        sa.Column('entry_type', sa.String(length=50), nullable=False),
        sa.Column('amount', sa.Numeric(precision=10, scale=2), nullable=False),
        sa.Column('currency', sa.String(length=10), nullable=False, server_default='INR'),
        sa.Column('status', sa.String(length=50), nullable=False, server_default='PENDING'),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['payment_id'], ['payments.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['payout_id'], ['payouts.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['refund_id'], ['refunds.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['freelancer_profile_id'], ['freelancer_profiles.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ledger_entries_id'), 'ledger_entries', ['id'], unique=False)
    op.create_index(op.f('ix_ledger_entries_freelancer_profile_id'), 'ledger_entries', ['freelancer_profile_id'], unique=False)
    op.create_index(op.f('ix_ledger_entries_booking_id'), 'ledger_entries', ['booking_id'], unique=False)


def downgrade():
    op.drop_table('ledger_entries')
    op.drop_table('payouts')
    op.drop_table('freelancer_payout_accounts')
    op.drop_table('refunds')
    op.drop_table('payment_webhook_events')
    op.drop_table('payment_attempts')
    op.drop_table('payments')
