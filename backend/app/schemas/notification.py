from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class NotificationOut(BaseModel):
    id: int
    user_id: int
    notification_type: str
    event_code: str
    title: str
    message: str
    action_url: Optional[str] = None
    entity_type: Optional[str] = None
    entity_id: Optional[int] = None
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationPreferencesOut(BaseModel):
    id: int
    user_id: int
    in_app_enabled: bool
    email_enabled: bool
    project_updates_email: bool
    proposal_updates_email: bool
    booking_updates_email: bool
    message_email: bool
    payment_email: bool
    delivery_email: bool
    review_email: bool
    payout_email: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class NotificationPreferencesUpdate(BaseModel):
    in_app_enabled: Optional[bool] = None
    email_enabled: Optional[bool] = None
    project_updates_email: Optional[bool] = None
    proposal_updates_email: Optional[bool] = None
    booking_updates_email: Optional[bool] = None
    message_email: Optional[bool] = None
    payment_email: Optional[bool] = None
    delivery_email: Optional[bool] = None
    review_email: Optional[bool] = None
    payout_email: Optional[bool] = None
