"""create_booking_and_messaging_tables

Revision ID: 3c9a62efd48e
Revises: 15b1747fd7a4
Create Date: 2026-08-13 17:26:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '3c9a62efd48e'
down_revision: Union[str, None] = '15b1747fd7a4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Conversations table
    op.create_table('conversations',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('client_id', sa.Integer(), nullable=False),
    sa.Column('freelancer_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['client_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['freelancer_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_conversations_client_id'), 'conversations', ['client_id'], unique=False)
    op.create_index(op.f('ix_conversations_freelancer_id'), 'conversations', ['freelancer_id'], unique=False)
    op.create_index(op.f('ix_conversations_id'), 'conversations', ['id'], unique=False)

    # Messages table
    op.create_table('messages',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('conversation_id', sa.Integer(), nullable=False),
    sa.Column('sender_id', sa.Integer(), nullable=False),
    sa.Column('message_text', sa.Text(), nullable=False),
    sa.Column('is_system', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['sender_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_messages_conversation_id'), 'messages', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_messages_id'), 'messages', ['id'], unique=False)
    op.create_index(op.f('ix_messages_sender_id'), 'messages', ['sender_id'], unique=False)

    # Bookings table
    op.create_table('bookings',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('client_id', sa.Integer(), nullable=False),
    sa.Column('freelancer_profile_id', sa.Integer(), nullable=False),
    sa.Column('service_id', sa.Integer(), nullable=False),
    sa.Column('service_package_id', sa.Integer(), nullable=False),
    sa.Column('booking_date', sa.DateTime(timezone=True), nullable=False),
    sa.Column('price', sa.Numeric(precision=10, scale=2), nullable=False),
    sa.Column('status', sa.Enum('PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'CANCELLED', name='bookingstatus'), nullable=False),
    sa.Column('notes', sa.Text(), nullable=True),
    sa.Column('requirements_answers', sa.JSON(), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['client_id'], ['users.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['freelancer_profile_id'], ['freelancer_profiles.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['service_id'], ['services.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['service_package_id'], ['service_packages.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_bookings_client_id'), 'bookings', ['client_id'], unique=False)
    op.create_index(op.f('ix_bookings_freelancer_profile_id'), 'bookings', ['freelancer_profile_id'], unique=False)
    op.create_index(op.f('ix_bookings_id'), 'bookings', ['id'], unique=False)
    op.create_index(op.f('ix_bookings_service_id'), 'bookings', ['service_id'], unique=False)
    op.create_index(op.f('ix_bookings_service_package_id'), 'bookings', ['service_package_id'], unique=False)
    op.create_index(op.f('ix_bookings_status'), 'bookings', ['status'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_bookings_status'), table_name='bookings')
    op.drop_index(op.f('ix_bookings_service_package_id'), table_name='bookings')
    op.drop_index(op.f('ix_bookings_service_id'), table_name='bookings')
    op.drop_index(op.f('ix_bookings_id'), table_name='bookings')
    op.drop_index(op.f('ix_bookings_freelancer_profile_id'), table_name='bookings')
    op.drop_index(op.f('ix_bookings_client_id'), table_name='bookings')
    op.drop_table('bookings')

    op.drop_index(op.f('ix_messages_sender_id'), table_name='messages')
    op.drop_index(op.f('ix_messages_id'), table_name='messages')
    op.drop_index(op.f('ix_messages_conversation_id'), table_name='messages')
    op.drop_table('messages')

    op.drop_index(op.f('ix_conversations_id'), table_name='conversations')
    op.drop_index(op.f('ix_conversations_freelancer_id'), table_name='conversations')
    op.drop_index(op.f('ix_conversations_client_id'), table_name='conversations')
    op.drop_table('conversations')
