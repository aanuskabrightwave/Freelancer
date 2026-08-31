from decimal import Decimal
from typing import Optional, List, Any
from datetime import datetime, date, time
from pydantic import BaseModel, ConfigDict, Field
from app.models.message import MessageType, ConversationType


class MessageAttachmentOut(BaseModel):
    id: int
    message_id: int
    workspace_file_id: int
    file_name: Optional[str] = None
    file_url: Optional[str] = None
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class MessageSenderOut(BaseModel):
    id: int
    full_name: str
    role: str

    model_config = ConfigDict(from_attributes=True)


class ManagedMessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: Optional[str] = None
    message_text: Optional[str] = None
    message_type: str
    reply_to_message_id: Optional[int] = None
    is_edited: bool = False
    is_deleted: bool = False
    is_system: bool = False
    created_at: datetime
    sender: Optional[MessageSenderOut] = None
    attachments: List[MessageAttachmentOut] = []

    model_config = ConfigDict(from_attributes=True)


class MessageSendPayload(BaseModel):
    content: Optional[str] = None
    message_text: Optional[str] = None # Backward compatibility
    reply_to_message_id: Optional[int] = None
    file_ids: Optional[List[int]] = None


class ConversationRoleContextOut(BaseModel):
    booking_id: Optional[int] = None
    booking_number: Optional[str] = None
    title: Optional[str] = None
    project_id: Optional[int] = None
    project_title: Optional[str] = None
    status: Optional[str] = None
    scheduled_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    location_city: Optional[str] = None
    venue_name: Optional[str] = None
    agreed_amount: Optional[Decimal] = None
    freelancer_payout_amount: Optional[Decimal] = None
    currency: Optional[str] = None
    
    # Sanitized display names only (no phone, email, WhatsApp)
    assigned_creator_display_name: Optional[str] = None
    client_display_name: Optional[str] = None
    admin_display_name: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ManagedParticipantOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    role: str
    last_read_message_id: Optional[int] = None
    last_read_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class ManagedConversationListItem(BaseModel):
    id: int
    conversation_type: str
    booking_id: Optional[int] = None
    project_id: Optional[int] = None
    
    # Recipient indicators for clear UI rendering
    recipient_role: str
    recipient_name: str
    recipient_user_id: Optional[int] = None
    
    latest_message: Optional[str] = None
    latest_message_sender_id: Optional[int] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    
    context: Optional[ConversationRoleContextOut] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ManagedConversationDetail(BaseModel):
    id: int
    conversation_type: str
    booking_id: Optional[int] = None
    project_id: Optional[int] = None
    client_id: Optional[int] = None
    freelancer_id: Optional[int] = None
    admin_id: Optional[int] = None
    
    recipient_role: str
    recipient_name: str
    unread_count: int = 0
    
    context: Optional[ConversationRoleContextOut] = None
    participants: List[ManagedParticipantOut] = []
    messages: List[ManagedMessageOut] = []
    
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
