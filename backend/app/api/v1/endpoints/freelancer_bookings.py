from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.booking import BookingStatus
from app.services.booking_service import BookingService
from app.schemas.booking import BookingResponse

router = APIRouter()


class FreelancerDeclinePayload(BaseModel):
    reason: Optional[str] = None


class FreelancerCancelPayload(BaseModel):
    reason: str


@router.get("/freelancer/bookings", response_model=List[BookingResponse], summary="List freelancer received booking requests")
def list_freelancer_bookings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(status_code=403, detail="Only freelancers can retrieve freelancer booking dashboards.")
    return BookingService.list_bookings(db, current_user)


@router.post("/freelancer/bookings/{id}/accept", response_model=BookingResponse, summary="Accept client booking request")
def accept_booking(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.update_booking_status(db, current_user, id, BookingStatus.CONFIRMED)


@router.post("/freelancer/bookings/{id}/reject", response_model=BookingResponse, summary="Decline client booking request")
def reject_booking(
    id: int,
    payload: FreelancerDeclinePayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.update_booking_status(db, current_user, id, BookingStatus.REJECTED, cancellation_reason=payload.reason)


@router.post("/freelancer/bookings/{id}/start", response_model=BookingResponse, summary="Start confirmed job")
def start_booking_job(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.update_booking_status(db, current_user, id, BookingStatus.IN_PROGRESS)


@router.post("/freelancer/bookings/{id}/mark-delivery-pending", response_model=BookingResponse, summary="Mark fulfillment status as delivery pending")
def mark_booking_delivery_pending(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.update_booking_status(db, current_user, id, BookingStatus.DELIVERY_PENDING)


@router.post("/freelancer/bookings/{id}/cancel", response_model=BookingResponse, summary="Cancel job")
def freelancer_cancel_booking(
    id: int,
    payload: FreelancerCancelPayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.update_booking_status(db, current_user, id, BookingStatus.CANCELLED, cancellation_reason=payload.reason)


# ----------------------------------------------------
# ADMIN-MANAGED ASSIGNMENTS ENGINE
# ----------------------------------------------------
from app.services.assignment_service import AssignmentService
from app.schemas.assignment import (
    FreelancerAssignmentListItem, FreelancerRejectPayload, BookingAssignmentOut
)


@router.get("/freelancer/bookings/assignments", response_model=List[FreelancerAssignmentListItem], summary="List assignment offers addressed to current freelancer")
@router.get("/freelancer/assignments", response_model=List[FreelancerAssignmentListItem], summary="List assignment offers addressed to current freelancer (alias)")
def list_freelancer_assignments(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(status_code=403, detail="Only freelancers can view assignment offers.")
    return AssignmentService.list_freelancer_assignments(db, current_user)


@router.post("/freelancer/assignments/{id}/accept", response_model=BookingAssignmentOut, summary="Accept booking assignment offer")
def accept_assignment(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(status_code=403, detail="Only freelancers can accept assignment offers.")
    return AssignmentService.freelancer_accept_assignment(db, current_user, id)


@router.post("/freelancer/assignments/{id}/reject", response_model=BookingAssignmentOut, summary="Decline assignment offer or submit counter-offer")
def reject_assignment(
    id: int,
    payload: FreelancerRejectPayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(status_code=403, detail="Only freelancers can decline assignment offers.")
    return AssignmentService.freelancer_reject_assignment(db, current_user, id, payload)

