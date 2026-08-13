from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import date, time, datetime


class RescheduleCreate(BaseModel):
    new_date: date
    new_start_time: str = Field("09:00", description="HH:MM format")
    new_end_time: str = Field("18:00", description="HH:MM format")
    reason: Optional[str] = None


class RescheduleResponse(BaseModel):
    id: int
    booking_id: int
    requested_by: str
    old_date: Optional[date] = None
    old_start_time: Optional[time] = None
    old_end_time: Optional[time] = None
    new_date: date
    new_start_time: Optional[time] = None
    new_end_time: Optional[time] = None
    reason: Optional[str] = None
    status: str
    created_at: datetime
    responded_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
