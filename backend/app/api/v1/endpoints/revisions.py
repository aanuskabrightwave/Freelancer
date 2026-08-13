from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.services.delivery_service import DeliveryService
from app.schemas.revision import (
    RevisionRequestResponse,
    RevisionCommentResponse,
    RevisionCommentCreatePayload
)

router = APIRouter()


@router.get("/bookings/{booking_id}/revisions", response_model=List[RevisionRequestResponse], summary="List booking revision requests")
def get_revision_requests(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return DeliveryService.get_revisions(db, current_user, booking_id)


@router.post("/freelancer/revisions/{revision_id}/start", response_model=RevisionRequestResponse, summary="Freelancer accept/start open revision request work")
def start_revision_work(
    revision_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return DeliveryService.start_revision(db, current_user, revision_id)


@router.post("/revisions/{revision_id}/comments", response_model=RevisionCommentResponse, status_code=status.HTTP_201_CREATED, summary="Add comment to revision request log")
def add_revision_comment(
    revision_id: int,
    payload: RevisionCommentCreatePayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return DeliveryService.add_comment(
        db,
        current_user,
        revision_id,
        payload.timestamp_seconds,
        payload.comment
    )


@router.get("/revisions/{revision_id}/comments", response_model=List[RevisionCommentResponse], summary="Get revision request comments log")
def get_revision_comments(
    revision_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Retrieve comments
    from app.repositories.delivery_repository import DeliveryRepository
    rev_req = DeliveryRepository.get_revision_request_by_id(db, revision_id)
    if not rev_req:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Revision request not found")
        
    from app.services.workspace_service import WorkspaceService
    booking = db.query(WorkspaceService.BookingRepository.Booking).filter(WorkspaceService.BookingRepository.Booking.id == rev_req.booking_id).first()
    WorkspaceService.validate_membership(db, current_user, booking)
    return DeliveryRepository.get_revision_comments(db, revision_id)
