from decimal import Decimal
from typing import Optional, Any, List
from pydantic import BaseModel, Field, ConfigDict
from datetime import datetime, date, time
from app.models.booking import BookingStatus, BookingSourceType


class BookingRequirementAnswerOut(BaseModel):
    id: int
    service_requirement_id: int
    answer_text: Optional[str] = None
    answer_number: Optional[Decimal] = None
    answer_date: Optional[date] = None
    answer_boolean: Optional[bool] = None
    file_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BookingCreate(BaseModel):
    service_id: int
    service_package_id: int
    scheduled_date: Optional[date] = None
    booking_date: Optional[datetime] = None  # Backward-compatibility fallback
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    venue_name: Optional[str] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    venue_address: Optional[str] = None
    notes: Optional[str] = None
    requirements_answers: Optional[dict[str, Any]] = None


class BookingUpdateStatus(BaseModel):
    status: BookingStatus
    cancellation_reason: Optional[str] = None


# Avoid circular imports by creating nested summaries
class UserSummaryOut(BaseModel):
    id: int
    full_name: str
    email: str
    phone: str

    model_config = ConfigDict(from_attributes=True)


class ServiceSummaryOut(BaseModel):
    id: int
    title: str
    slug: str
    service_type: str

    model_config = ConfigDict(from_attributes=True)


class PackageSummaryOut(BaseModel):
    id: int
    package_type: str
    name: str
    price: Decimal

    model_config = ConfigDict(from_attributes=True)


class BookingResponse(BaseModel):
    id: int
    booking_number: str
    client_id: int
    freelancer_profile_id: int
    source_type: BookingSourceType
    
    # Direct service
    service_id: Optional[int] = None
    service_package_id: Optional[int] = None
    
    # Project flow
    project_id: Optional[int] = None
    proposal_id: Optional[int] = None

    title: Optional[str] = None
    description: Optional[str] = None
    booking_type: str
    status: BookingStatus
    
    scheduled_date: Optional[date] = None
    booking_date: datetime  # Kept for backward compatibility
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    timezone: str
    expected_duration_hours: Optional[int] = None
    delivery_deadline: Optional[datetime] = None

    location_city: Optional[str] = None
    location_state: Optional[str] = None
    location_country: Optional[str] = None
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None

    agreed_amount: Decimal
    currency: str
    price: Decimal  # Kept for backward compatibility

    notes: Optional[str] = None
    requirements_answers: Optional[dict[str, Any]] = None
    cancellation_reason: Optional[str] = None
    cancelled_by: Optional[str] = None

    confirmed_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    client: Optional[UserSummaryOut] = None
    service: Optional[ServiceSummaryOut] = None
    package: Optional[PackageSummaryOut] = None

    model_config = ConfigDict(from_attributes=True)
