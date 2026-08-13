"""create_phase_7_tables

Revision ID: df74811ae23c
Revises: ca92837ff48b
Create Date: 2026-08-13 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import mysql

# revision identifiers, used by Alembic.
revision = 'df74811ae23c'
down_revision = 'ca92837ff48b'
branch_labels = None
depends_on = None


def upgrade():
    # 1. Create booking_workspaces
    op.create_table(
        'booking_workspaces',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('booking_id')
    )
    op.create_index(op.f('ix_booking_workspaces_booking_id'), 'booking_workspaces', ['booking_id'], unique=True)
    op.create_index(op.f('ix_booking_workspaces_id'), 'booking_workspaces', ['id'], unique=False)

    # 2. Add columns to conversations
    op.add_column('conversations', sa.Column('workspace_id', sa.Integer(), nullable=True))
    op.add_column('conversations', sa.Column('booking_id', sa.Integer(), nullable=True))
    op.create_foreign_key('fk_conversations_workspace_id', 'conversations', 'booking_workspaces', ['workspace_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key('fk_conversations_booking_id', 'conversations', 'bookings', ['booking_id'], ['id'], ondelete='CASCADE')
    op.create_index(op.f('ix_conversations_workspace_id'), 'conversations', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_conversations_booking_id'), 'conversations', ['booking_id'], unique=False)

    # 3. Add columns to messages
    op.add_column('messages', sa.Column('content', sa.Text(), nullable=True))
    op.add_column('messages', sa.Column('message_type', sa.Enum('TEXT', 'FILE', 'IMAGE', 'SYSTEM', 'DELIVERY', 'REVISION', name='messagetype'), server_default='TEXT', nullable=False))
    op.add_column('messages', sa.Column('reply_to_message_id', sa.Integer(), nullable=True))
    op.add_column('messages', sa.Column('is_edited', sa.Boolean(), server_default='0', nullable=False))
    op.add_column('messages', sa.Column('is_deleted', sa.Boolean(), server_default='0', nullable=False))
    op.alter_column('messages', 'message_text', existing_type=sa.Text(), nullable=True) # allow null text for file type messages
    op.create_foreign_key('fk_messages_reply_to_message_id', 'messages', 'messages', ['reply_to_message_id'], ['id'], ondelete='SET_NULL')
    op.create_index(op.f('ix_messages_reply_to_message_id'), 'messages', ['reply_to_message_id'], unique=False)

    # 4. Create conversation_participants
    op.create_table(
        'conversation_participants',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('conversation_id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.Integer(), nullable=False),
        sa.Column('last_read_message_id', sa.Integer(), nullable=True),
        sa.Column('last_read_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('joined_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['conversation_id'], ['conversations.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['last_read_message_id'], ['messages.id'], ondelete='SET_NULL'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_conversation_participants_conversation_id'), 'conversation_participants', ['conversation_id'], unique=False)
    op.create_index(op.f('ix_conversation_participants_user_id'), 'conversation_participants', ['user_id'], unique=False)
    op.create_index(op.f('ix_conversation_participants_id'), 'conversation_participants', ['id'], unique=False)

    # 5. Create workspace_files
    op.create_table(
        'workspace_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('uploaded_by_user_id', sa.Integer(), nullable=False),
        sa.Column('file_category', sa.Enum('REFERENCE', 'PROJECT_FILE', 'PREVIEW', 'FINAL_DELIVERY', 'DOCUMENT', 'OTHER', name='filecategory'), server_default='OTHER', nullable=False),
        sa.Column('original_name', sa.String(length=255), nullable=False),
        sa.Column('stored_name', sa.String(length=255), nullable=False),
        sa.Column('file_url', sa.String(length=500), nullable=False),
        sa.Column('mime_type', sa.String(length=100), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['uploaded_by_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['booking_workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workspace_files_workspace_id'), 'workspace_files', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_workspace_files_id'), 'workspace_files', ['id'], unique=False)

    # 6. Create workspace_links
    op.create_table(
        'workspace_links',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('created_by_user_id', sa.Integer(), nullable=False),
        sa.Column('label', sa.String(length=255), nullable=False),
        sa.Column('url', sa.String(length=500), nullable=False),
        sa.Column('link_type', sa.String(length=50), server_default='EXTERNAL', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['booking_workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workspace_links_workspace_id'), 'workspace_links', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_workspace_links_id'), 'workspace_links', ['id'], unique=False)

    # 7. Create message_attachments
    op.create_table(
        'message_attachments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('message_id', sa.Integer(), nullable=False),
        sa.Column('workspace_file_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['message_id'], ['messages.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_file_id'], ['workspace_files.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_message_attachments_message_id'), 'message_attachments', ['message_id'], unique=False)
    op.create_index(op.f('ix_message_attachments_workspace_file_id'), 'message_attachments', ['workspace_file_id'], unique=False)
    op.create_index(op.f('ix_message_attachments_id'), 'message_attachments', ['id'], unique=False)

    # 8. Create deliveries
    op.create_table(
        'deliveries',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('delivery_type', sa.Enum('PREVIEW', 'REVISION', 'FINAL', name='deliverytype'), server_default='PREVIEW', nullable=False),
        sa.Column('version', sa.Integer(), server_default='1', nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('message', sa.Text(), nullable=True),
        sa.Column('status', sa.Enum('SUBMITTED', 'UNDER_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'SUPERSEDED', name='deliverystatus'), server_default='SUBMITTED', nullable=False),
        sa.Column('submitted_by_user_id', sa.Integer(), nullable=False),
        sa.Column('submitted_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('approved_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['submitted_by_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['booking_workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_deliveries_booking_id'), 'deliveries', ['booking_id'], unique=False)
    op.create_index(op.f('ix_deliveries_workspace_id'), 'deliveries', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_deliveries_id'), 'deliveries', ['id'], unique=False)

    # 9. Create delivery_files
    op.create_table(
        'delivery_files',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('delivery_id', sa.Integer(), nullable=False),
        sa.Column('workspace_file_id', sa.Integer(), nullable=False),
        sa.Column('sort_order', sa.Integer(), server_default='0', nullable=False),
        sa.ForeignKeyConstraint(['delivery_id'], ['deliveries.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_file_id'], ['workspace_files.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_delivery_files_delivery_id'), 'delivery_files', ['delivery_id'], unique=False)
    op.create_index(op.f('ix_delivery_files_workspace_file_id'), 'delivery_files', ['workspace_file_id'], unique=False)
    op.create_index(op.f('ix_delivery_files_id'), 'delivery_files', ['id'], unique=False)

    # 10. Create revision_requests
    op.create_table(
        'revision_requests',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('booking_id', sa.Integer(), nullable=False),
        sa.Column('delivery_id', sa.Integer(), nullable=False),
        sa.Column('requested_by_user_id', sa.Integer(), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=False),
        sa.Column('status', sa.Enum('OPEN', 'IN_PROGRESS', 'RESOLVED', 'CANCELLED', name='revisionstatus'), server_default='OPEN', nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('resolved_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['booking_id'], ['bookings.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['delivery_id'], ['deliveries.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['requested_by_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_revision_requests_booking_id'), 'revision_requests', ['booking_id'], unique=False)
    op.create_index(op.f('ix_revision_requests_delivery_id'), 'revision_requests', ['delivery_id'], unique=False)
    op.create_index(op.f('ix_revision_requests_status'), 'revision_requests', ['status'], unique=False)
    op.create_index(op.f('ix_revision_requests_id'), 'revision_requests', ['id'], unique=False)

    # 11. Create revision_comments
    op.create_table(
        'revision_comments',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('revision_request_id', sa.Integer(), nullable=False),
        sa.Column('timestamp_seconds', sa.Integer(), nullable=True),
        sa.Column('comment', sa.Text(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['revision_request_id'], ['revision_requests.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_revision_comments_revision_request_id'), 'revision_comments', ['revision_request_id'], unique=False)
    op.create_index(op.f('ix_revision_comments_id'), 'revision_comments', ['id'], unique=False)

    # 12. Create workspace_events
    op.create_table(
        'workspace_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('workspace_id', sa.Integer(), nullable=False),
        sa.Column('event_type', sa.Enum('BOOKING_CONFIRMED', 'WORK_STARTED', 'FILE_UPLOADED', 'PREVIEW_SUBMITTED', 'REVISION_REQUESTED', 'REVISION_SUBMITTED', 'FINAL_DELIVERY', 'BOOKING_COMPLETED', 'MESSAGE_SYSTEM', name='workspaceeventtype'), nullable=False),
        sa.Column('actor_user_id', sa.Integer(), nullable=True),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('metadata_json', sa.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['actor_user_id'], ['users.id'], ondelete='SET_NULL'),
        sa.ForeignKeyConstraint(['workspace_id'], ['booking_workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_workspace_events_workspace_id'), 'workspace_events', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_workspace_events_created_at'), 'workspace_events', ['created_at'], unique=False)
    op.create_index(op.f('ix_workspace_events_id'), 'workspace_events', ['id'], unique=False)


def downgrade():
    op.drop_table('workspace_events')
    op.drop_table('revision_comments')
    op.drop_table('revision_requests')
    op.drop_table('delivery_files')
    op.drop_table('deliveries')
    op.drop_table('message_attachments')
    op.drop_table('workspace_links')
    op.drop_table('workspace_files')
    op.drop_table('conversation_participants')
    
    op.drop_index(op.f('ix_conversations_booking_id'), table_name='conversations')
    op.drop_index(op.f('ix_conversations_workspace_id'), table_name='conversations')
    op.drop_constraint('fk_conversations_booking_id', 'conversations', type_='foreignkey')
    op.drop_constraint('fk_conversations_workspace_id', 'conversations', type_='foreignkey')
    op.drop_column('conversations', 'booking_id')
    op.drop_column('conversations', 'workspace_id')

    op.drop_index(op.f('ix_messages_reply_to_message_id'), table_name='messages')
    op.drop_constraint('fk_messages_reply_to_message_id', 'messages', type_='foreignkey')
    op.drop_column('messages', 'is_deleted')
    op.drop_column('messages', 'is_edited')
    op.drop_column('messages', 'reply_to_message_id')
    op.drop_column('messages', 'message_type')
    op.drop_column('messages', 'content')
    op.alter_column('messages', 'message_text', existing_type=sa.Text(), nullable=False)

    op.drop_table('booking_workspaces')
