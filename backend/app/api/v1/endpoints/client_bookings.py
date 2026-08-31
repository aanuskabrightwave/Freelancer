from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from decimal import Decimal
from datetime import date

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.booking import BookingStatus
from app.services.booking_service import BookingService
from app.schemas.booking import BookingCreate, BookingResponse
from app.schemas.project import ProposalResponse
from pydantic import BaseModel

router = APIRouter()


class ProposalAcceptPayload(BaseModel):
    scheduled_date: date
    start_time: str
    end_time: str
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None


class ClientCancellationPayload(BaseModel):
    reason: str


@router.post("/client/bookings", response_model=BookingResponse, status_code=status.HTTP_201_CREATED, summary="Create a direct service booking")
def create_direct_booking(
    booking_in: BookingCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only CLIENT users can submit booking requests.")
    return BookingService.create_booking(db, current_user.id, booking_in.model_dump())


@router.get("/client/bookings", response_model=List[BookingResponse], summary="List client bookings")
def list_client_bookings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.list_bookings(db, current_user)


@router.post("/client/bookings/{id}/complete", response_model=BookingResponse, summary="Mark delivery pending booking as completed")
def complete_booking(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.update_booking_status(db, current_user, id, BookingStatus.COMPLETED)


@router.post("/client/bookings/{id}/cancel", response_model=BookingResponse, summary="Cancel booking")
def client_cancel_booking(
    id: int,
    payload: ClientCancellationPayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return BookingService.update_booking_status(db, current_user, id, BookingStatus.CANCELLED, cancellation_reason=payload.reason)


@router.post("/client/proposals/{proposal_id}/accept", response_model=BookingResponse, status_code=status.HTTP_201_CREATED, summary="Accept proposal and auto-create project booking")
def accept_proposal(
    proposal_id: int,
    payload: ProposalAcceptPayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only client accounts can award proposals")
        
    return BookingService.accept_proposal(
        db,
        client_id=current_user.id,
        proposal_id=proposal_id,
        scheduled_date_val=payload.scheduled_date,
        start_time_str=payload.start_time,
        end_time_str=payload.end_time,
        venue_name=payload.venue_name,
        venue_address=payload.venue_address,
        city=payload.city,
        state=payload.state
    )


# ----------------------------------------------------
# ADMIN-MANAGED REPLACEMENT CLIENT DECISION
# ----------------------------------------------------
from app.services.assignment_service import AssignmentService
from app.schemas.assignment import (
    ClientReplacementDecisionPayload, BookingAssignmentOut
)


@router.post("/client/bookings/{booking_id}/replacement/{assignment_id}/respond", response_model=BookingAssignmentOut, summary="Approve or decline replacement creator suggested by admin")
@router.post("/client/assignments/{assignment_id}/respond", response_model=BookingAssignmentOut, summary="Approve or decline replacement creator (alias)")
def respond_to_replacement(
    booking_id: Optional[int] = None,
    assignment_id: int = 0,
    payload: ClientReplacementDecisionPayload = ...,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only client accounts can respond to replacement creator offers.")
    
    # If booking_id is not in URL (alias path), resolve from assignment
    if not booking_id:
        from app.models.booking_assignment import BookingAssignment
        assign = db.query(BookingAssignment).filter(BookingAssignment.id == assignment_id).first()
        if not assign:
            raise HTTPException(status_code=404, detail="Assignment not found.")
        booking_id = assign.booking_id

    return AssignmentService.client_respond_to_replacement(db, current_user, booking_id, assignment_id, payload)

