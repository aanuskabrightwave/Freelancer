from decimal import Decimal
from typing import Optional, List, Any
from datetime import datetime, date, time
from pydantic import BaseModel, ConfigDict, Field
from app.models.booking import BookingStatus, BookingSourceType
from app.models.booking_assignment import AssignmentStatus, ClientApprovalStatus


# --- Shared User / Profile Summaries ---
class UserMiniOut(BaseModel):
    id: int
    full_name: str
    email: str
    phone: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class FreelancerMiniOut(BaseModel):
    id: int
    user_id: int
    professional_title: Optional[str] = None
    primary_profession: Optional[str] = None
    city: Optional[str] = None
    full_name: Optional[str] = None
    user: Optional[UserMiniOut] = None

    model_config = ConfigDict(from_attributes=True)


# --- Booking Assignment Schemas ---
class BookingAssignmentOut(BaseModel):
    id: int
    booking_id: int
    freelancer_profile_id: int
    assigned_by_admin_id: int
    assignment_round: int
    status: str
    offered_payout_amount: Decimal
    decline_reason: Optional[str] = None
    counter_offer_amount: Optional[Decimal] = None
    counter_offer_notes: Optional[str] = None
    is_replacement: bool
    client_approval_required: bool
    client_approval_status: str
    client_approval_notes: Optional[str] = None
    client_responded_at: Optional[datetime] = None
    expires_at: Optional[datetime] = None
    offered_at: datetime
    responded_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    freelancer_profile: Optional[FreelancerMiniOut] = None
    assigned_by_admin: Optional[UserMiniOut] = None

    model_config = ConfigDict(from_attributes=True)


# --- Admin Request Payloads ---
class AdminReviewBookingPayload(BaseModel):
    admin_notes: Optional[str] = None


class AdminAssignFreelancerPayload(BaseModel):
    freelancer_profile_id: int
    offered_payout_amount: Optional[Decimal] = Field(None, ge=0)
    admin_notes: Optional[str] = None
    expires_at: Optional[datetime] = None


# --- Freelancer Request / Response Schemas ---
class FreelancerRejectPayload(BaseModel):
    reason: str = Field(..., min_length=1, description="Mandatory reason for declining the assignment")
    counter_offer_amount: Optional[Decimal] = Field(None, ge=0)
    counter_offer_notes: Optional[str] = None


class FreelancerAssignmentListItem(BaseModel):
    id: int
    booking_id: int
    booking_number: str
    assignment_round: int
    status: str
    offered_payout_amount: Decimal
    is_replacement: bool
    decline_reason: Optional[str] = None
    counter_offer_amount: Optional[Decimal] = None
    counter_offer_notes: Optional[str] = None
    offered_at: datetime
    expires_at: Optional[datetime] = None
    responded_at: Optional[datetime] = None

    # Safe booking context for freelancer (no client private contact)
    title: Optional[str] = None
    description: Optional[str] = None
    scheduled_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    venue_name: Optional[str] = None
    source_type: str

    model_config = ConfigDict(from_attributes=True)


# --- Client Request Payloads ---
class ClientReplacementDecisionPayload(BaseModel):
    approved: bool
    notes: Optional[str] = None


# --- Admin Booking List / Detail Schemas ---
class PaymentSummaryOut(BaseModel):
    agreed_amount: Decimal
    deposit_amount: Decimal
    deposit_paid_amount: Decimal
    remaining_balance: Decimal
    total_paid: Decimal
    payment_completion_state: str
    currency: str


class AdminBookingListItem(BaseModel):
    id: int
    booking_number: str
    title: Optional[str] = None
    source_type: BookingSourceType
    status: BookingStatus
    scheduled_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    location_city: Optional[str] = None
    venue_name: Optional[str] = None
    agreed_amount: Decimal
    freelancer_payout_amount: Optional[Decimal] = None
    currency: str
    is_admin_managed: bool
    created_at: datetime

    client: Optional[UserMiniOut] = None
    selected_freelancer: Optional[FreelancerMiniOut] = None
    freelancer: Optional[FreelancerMiniOut] = None
    active_assignment: Optional[BookingAssignmentOut] = None
    payment_summary: Optional[PaymentSummaryOut] = None

    model_config = ConfigDict(from_attributes=True)


class AdminBookingDetail(BaseModel):
    id: int
    booking_number: str
    title: Optional[str] = None
    description: Optional[str] = None
    source_type: BookingSourceType
    booking_type: str
    status: BookingStatus
    agreed_amount: Decimal
    scheduled_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    timezone: str
    location_city: Optional[str] = None
    location_state: Optional[str] = None
    location_country: Optional[str] = None
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    notes: Optional[str] = None
    admin_notes: Optional[str] = None
    is_admin_managed: bool
    service_id: Optional[int] = None
    service_package_id: Optional[int] = None
    selected_freelancer_profile_id: Optional[int] = None
    freelancer_profile_id: Optional[int] = None
    project_id: Optional[int] = None
    proposal_id: Optional[int] = None
    requirements_answers: Optional[dict[str, Any]] = None
    confirmed_at: Optional[datetime] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    client: Optional[UserMiniOut] = None
    selected_freelancer: Optional[FreelancerMiniOut] = None
    freelancer: Optional[FreelancerMiniOut] = None
    assigned_by_admin: Optional[UserMiniOut] = None
    payment_summary: Optional[PaymentSummaryOut] = None
    assignments: List[BookingAssignmentOut] = []

    model_config = ConfigDict(from_attributes=True)
