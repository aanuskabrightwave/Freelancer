from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import date, time, datetime


class WeeklyScheduleItem(BaseModel):
    day_of_week: str = Field(..., description="MONDAY, TUESDAY, etc.")
    is_available: bool = Field(True)
    start_time: str = Field("09:00", description="HH:MM format")
    end_time: str = Field("18:00", description="HH:MM format")


class WeeklyScheduleUpdate(BaseModel):
    schedules: List[WeeklyScheduleItem]


class WeeklyScheduleResponse(BaseModel):
    id: int
    freelancer_profile_id: int
    day_of_week: str
    is_available: bool
    start_time: time
    end_time: time

    model_config = ConfigDict(from_attributes=True)


class AvailabilityOverrideCreate(BaseModel):
    date: date
    start_time: Optional[str] = Field(None, description="HH:MM format")
    end_time: Optional[str] = Field(None, description="HH:MM format")
    availability_type: str = Field("UNAVAILABLE", description="AVAILABLE, UNAVAILABLE, BLOCKED")
    note: Optional[str] = None


class AvailabilityOverrideResponse(BaseModel):
    id: int
    freelancer_profile_id: int
    date: date
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    availability_type: str
    note: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PublicAvailabilityCheckResponse(BaseModel):
    date: date
    available: bool
