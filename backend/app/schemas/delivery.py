from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from app.schemas.workspace import WorkspaceFileResponse


class DeliveryFileOut(BaseModel):
    id: int
    delivery_id: int
    workspace_file_id: int
    workspace_file: Optional[WorkspaceFileResponse] = None

    model_config = ConfigDict(from_attributes=True)


class DeliveryResponse(BaseModel):
    id: int
    booking_id: int
    workspace_id: int
    delivery_type: str
    version: int
    title: str
    message: Optional[str] = None
    status: str
    admin_review_status: Optional[str] = "PENDING"
    admin_feedback_to_freelancer: Optional[str] = None
    admin_reviewed_at: Optional[datetime] = None
    shared_with_client_at: Optional[datetime] = None
    submitted_by_user_id: int
    submitted_at: datetime
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime
    
    delivery_files: List[DeliveryFileOut] = []

    model_config = ConfigDict(from_attributes=True)


class DeliveryCreatePayload(BaseModel):
    delivery_type: str = Field("PREVIEW", description="PREVIEW or FINAL")
    title: str = Field(..., min_length=2, max_length=255)
    message: Optional[str] = None
    file_ids: List[int] = Field(default_factory=list)


class AdminRequestChangesPayload(BaseModel):
    feedback: str = Field(..., min_length=3, max_length=2000)


class AdminDeliveryListItem(BaseModel):
    id: int
    booking_id: int
    booking_number: str
    booking_title: Optional[str] = None
    client_name: str
    freelancer_name: Optional[str] = None
    delivery_type: str
    version: int
    title: str
    status: str
    admin_review_status: str
    submitted_at: datetime
    shared_with_client_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    revision_count: int
    agreed_amount: float
    deposit_paid_amount: float
    remaining_balance: float
    payment_completion_state: str

    model_config = ConfigDict(from_attributes=True)

