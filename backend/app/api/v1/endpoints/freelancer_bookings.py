from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
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
    if current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role) != "FREELANCER":
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
