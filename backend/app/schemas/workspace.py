from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime


class WorkspaceFileResponse(BaseModel):
    id: int
    workspace_id: int
    uploaded_by_user_id: int
    file_category: str
    original_name: str
    stored_name: str
    file_url: str
    mime_type: Optional[str] = None
    file_size: Optional[int] = None
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkspaceLinkResponse(BaseModel):
    id: int
    workspace_id: int
    created_by_user_id: int
    label: str
    url: str
    link_type: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkspaceEventResponse(BaseModel):
    id: int
    workspace_id: int
    event_type: str
    actor_user_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class WorkspaceResponse(BaseModel):
    id: int
    booking_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
