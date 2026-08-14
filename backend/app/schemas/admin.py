from pydantic import BaseModel, Field
from typing import Optional, List, Any
from datetime import datetime
from decimal import Decimal
from app.models.verification import DocumentType, DocumentStatus
from app.models.dispute import DisputeReason, DisputeStatus, DisputePriority, ResolutionType


class UserSuspendPayload(BaseModel):
    reason: str = Field(..., min_length=5, max_length=1000)


class VerificationReviewPayload(BaseModel):
    reason: Optional[str] = Field(None, max_length=1000)
    admin_notes: Optional[str] = Field(None, max_length=2000)


class CategoryCreatePayload(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    slug: str = Field(..., min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    parent_id: Optional[int] = None
    sort_order: Optional[int] = 0
    icon: Optional[str] = None


class CategoryUpdatePayload(BaseModel):
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    slug: Optional[str] = Field(None, min_length=2, max_length=100)
    description: Optional[str] = Field(None, max_length=1000)
    parent_id: Optional[int] = None
    sort_order: Optional[int] = None
    icon: Optional[str] = None
    is_active: Optional[bool] = None


class DisputeCreatePayload(BaseModel):
    reason: DisputeReason
    description: str = Field(..., min_length=10, max_length=3000)


class DisputeMessageCreatePayload(BaseModel):
    message: str = Field(..., min_length=1, max_length=3000)
    is_internal_admin_note: Optional[bool] = False


class DisputeResolvePayload(BaseModel):
    resolution_type: ResolutionType
    resolution_notes: str = Field(..., min_length=5, max_length=2000)
    partial_refund_amount: Optional[Decimal] = None


class PlatformSettingUpdatePayload(BaseModel):
    value: str = Field(..., min_length=1, max_length=5000)


class PlatformSettingOut(BaseModel):
    id: int
    key: str
    value: str
    value_type: str
    description: Optional[str]
    is_public: bool

    class Config:
        from_attributes = True


class DisputeOut(BaseModel):
    id: int
    dispute_number: str
    booking_id: int
    opened_by_user_id: int
    against_user_id: int
    reason: DisputeReason
    description: str
    status: DisputeStatus
    priority: DisputePriority
    assigned_admin_id: Optional[int] = None
    resolution_type: Optional[ResolutionType] = None
    resolution_notes: Optional[str] = None
    opened_at: datetime
    resolved_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# Responses
class AdminAuditLogOut(BaseModel):
    id: int
    admin_user_id: int
    action: str
    entity_type: Optional[str]
    entity_id: Optional[int]
    description: str
    metadata_json: Optional[Any]
    ip_address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True
