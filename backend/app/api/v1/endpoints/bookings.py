from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from pydantic import BaseModel

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.services.booking_service import BookingService
from app.schemas.booking import BookingCreate, BookingResponse, BookingUpdateStatus
from app.schemas.reschedule import RescheduleCreate, RescheduleResponse

router = APIRouter()


class BookingDeclinePayload(BaseModel):
    reason: Optional[str] = None


@router.post("/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED, summary="Create a new service booking")
def create_booking(
    booking_in: BookingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.create_booking(db, current_user.id, booking_in.model_dump())


@router.get("/bookings", response_model=List[BookingResponse], summary="List my active bookings")
def list_bookings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.list_bookings(db, current_user)


@router.get("/bookings/{id}", response_model=BookingResponse, summary="Get booking details")
def get_booking(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.get_booking_by_id(db, current_user, id)


@router.put("/bookings/{id}/status", response_model=BookingResponse, summary="Update booking status")
def update_booking_status(
    id: int,
    status_in: BookingUpdateStatus,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.update_booking_status(
        db, current_user, id, status_in.status, cancellation_reason=status_in.cancellation_reason
    )


# RESCHEDULING ROUTES
@router.get("/bookings/{id}/reschedule/pending", response_model=RescheduleResponse, summary="Get pending reschedule request")
def get_pending_reschedule_request(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from app.repositories.reschedule_repository import RescheduleRepository
    req = RescheduleRepository.get_pending_request_for_booking(db, id)
    if not req:
        raise HTTPException(status_code=404, detail="No pending reschedule request found")
    return req


@router.post("/bookings/{id}/reschedule", response_model=RescheduleResponse, status_code=status.HTTP_201_CREATED, summary="Submit a reschedule request")
def submit_reschedule_request(
    id: int,
    payload: RescheduleCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from datetime import datetime
    new_d = payload.new_date
    start_t = datetime.strptime(payload.new_start_time, "%H:%M").time()
    end_t = datetime.strptime(payload.new_end_time, "%H:%M").time()

    return BookingService.request_reschedule(
        db, current_user, id, new_d, start_t, end_t, payload.reason
    )


@router.post("/bookings/{id}/reschedule/{request_id}/accept", response_model=BookingResponse, summary="Accept reschedule request")
def accept_reschedule_request(
    id: int,
    request_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.respond_reschedule(db, current_user, id, request_id, accept=True)


@router.post("/bookings/{id}/reschedule/{request_id}/reject", response_model=BookingResponse, summary="Reject reschedule request")
def reject_reschedule_request(
    id: int,
    request_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.respond_reschedule(db, current_user, id, request_id, accept=False)


from app.services.dispute_service import DisputeService
from app.schemas.admin import DisputeCreatePayload, DisputeOut

@router.post("/bookings/{id}/disputes", response_model=DisputeOut, status_code=status.HTTP_201_CREATED, summary="Open a dispute on a booking")
def open_booking_dispute(
    id: int,
    payload: DisputeCreatePayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return DisputeService.open_dispute(db, current_user, id, payload.reason, payload.description)


class FreelancerQuotePayload(BaseModel):
    proposed_amount: float
    deposit_amount: float


@router.post("/bookings/{id}/quote", response_model=BookingResponse, summary="Freelancer sends a quote for requested booking")
def send_booking_quote(
    id: int,
    payload: FreelancerQuotePayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from decimal import Decimal
    return BookingService.send_quote(
        db, current_user, id, Decimal(str(payload.proposed_amount)), Decimal(str(payload.deposit_amount))
    )


@router.post("/bookings/{id}/accept-quote", response_model=BookingResponse, summary="Client accepts quote")
def accept_booking_quote(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.accept_quote(db, current_user, id)


@router.post("/bookings/{id}/approve-preview", response_model=BookingResponse, summary="Client approves preview draft")
def approve_booking_preview(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.approve_preview(db, current_user, id)


@router.post("/bookings/{id}/approve-final", response_model=BookingResponse, summary="Client approves final project delivery")
def approve_booking_final_delivery(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.approve_final_delivery(db, current_user, id)

