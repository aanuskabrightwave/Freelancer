from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime


class RevisionCommentResponse(BaseModel):
    id: int
    revision_request_id: int
    timestamp_seconds: Optional[int] = None
    comment: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RevisionRequestResponse(BaseModel):
    id: int
    booking_id: int
    delivery_id: int
    requested_by_user_id: int
    title: str
    description: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime] = None
    
    comments: List[RevisionCommentResponse] = []

    model_config = ConfigDict(from_attributes=True)


class RevisionRequestCreatePayload(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=5)


class RevisionCommentCreatePayload(BaseModel):
    timestamp_seconds: Optional[int] = Field(None, ge=0)
    comment: str = Field(..., min_length=1)
