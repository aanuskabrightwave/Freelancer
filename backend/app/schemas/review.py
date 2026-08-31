from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field, field_validator
from app.models.review import ReviewStatus
from app.models.review_report import ReportReason, ReportStatus


class ReviewBase(BaseModel):
    overall_rating: int = Field(..., ge=1, le=5)
    quality_rating: Optional[int] = Field(None, ge=1, le=5)
    communication_rating: Optional[int] = Field(None, ge=1, le=5)
    professionalism_rating: Optional[int] = Field(None, ge=1, le=5)
    timeliness_rating: Optional[int] = Field(None, ge=1, le=5)
    value_rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, max_length=150)
    comment: Optional[str] = Field(None, max_length=3000)


class ReviewCreate(ReviewBase):
    pass


class ReviewUpdate(BaseModel):
    overall_rating: Optional[int] = Field(None, ge=1, le=5)
    quality_rating: Optional[int] = Field(None, ge=1, le=5)
    communication_rating: Optional[int] = Field(None, ge=1, le=5)
    professionalism_rating: Optional[int] = Field(None, ge=1, le=5)
    timeliness_rating: Optional[int] = Field(None, ge=1, le=5)
    value_rating: Optional[int] = Field(None, ge=1, le=5)
    title: Optional[str] = Field(None, max_length=150)
    comment: Optional[str] = Field(None, max_length=3000)


class ReviewResponseCreate(BaseModel):
    response: str = Field(..., min_length=5, max_length=2000)


class ReviewResponseOut(BaseModel):
    id: int
    review_id: int
    freelancer_profile_id: int
    response: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ReviewReportCreate(BaseModel):
    reason: ReportReason
    details: Optional[str] = Field(None, max_length=1000)


class ReviewReportOut(BaseModel):
    id: int
    review_id: int
    reported_by_user_id: int
    reason: ReportReason
    details: Optional[str]
    status: ReportStatus
    created_at: datetime
    resolved_at: Optional[datetime]

    model_config = {"from_attributes": True}


class ReviewOut(ReviewBase):
    id: int
    booking_id: int
    client_id: int
    freelancer_profile_id: int
    service_id: Optional[int] = None
    project_id: Optional[int] = None
    status: ReviewStatus
    is_verified_booking: bool
    created_at: datetime
    updated_at: datetime
    
    # Nested response if present
    response_obj: Optional[ReviewResponseOut] = None
    client_name: Optional[str] = None # Added for display convenience

    model_config = {"from_attributes": True}
