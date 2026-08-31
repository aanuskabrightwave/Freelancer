from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.schemas.workspace import WorkspaceFileResponse


class MessageAttachmentOut(BaseModel):
    id: int
    message_id: int
    workspace_file_id: int
    workspace_file: Optional[WorkspaceFileResponse] = None

    model_config = ConfigDict(from_attributes=True)


class MessageResponse(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    content: Optional[str] = None
    message_text: Optional[str] = None # Backward compatibility
    message_type: str
    reply_to_message_id: Optional[int] = None
    is_edited: bool
    is_deleted: bool
    is_system: bool
    created_at: datetime
    
    # Nested attachments
    attachments: List[MessageAttachmentOut] = []

    model_config = ConfigDict(from_attributes=True)


class MessageCreatePayload(BaseModel):
    content: str = Field(..., min_length=1)
    reply_to_message_id: Optional[int] = None
    file_ids: Optional[List[int]] = None


class MessageEditPayload(BaseModel):
    content: str = Field(..., min_length=1)


# Legacy backward-compatibility schemas
class MessageCreate(BaseModel):
    message_text: str = Field(..., min_length=1)


class ConversationCreate(BaseModel):
    freelancer_id: Optional[int] = None
    client_id: Optional[int] = None


class ConversationParticipant(BaseModel):
    id: int
    full_name: str

    model_config = ConfigDict(from_attributes=True)


class ConversationResponse(BaseModel):
    id: int
    client_id: int
    freelancer_id: int
    client: Optional[ConversationParticipant] = None
    freelancer: Optional[ConversationParticipant] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
