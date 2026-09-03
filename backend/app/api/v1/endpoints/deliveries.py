from fastapi import APIRouter, Depends, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.services.delivery_service import DeliveryService
from app.schemas.delivery import DeliveryResponse, DeliveryCreatePayload, AdminRequestChangesPayload
from app.schemas.revision import RevisionRequestResponse, RevisionRequestCreatePayload

router = APIRouter()


@router.get("/bookings/{booking_id}/deliveries", response_model=List[DeliveryResponse], summary="List workspace project deliveries")
def get_deliveries(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return DeliveryService.get_deliveries(db, current_user, booking_id)


@router.get("/client/bookings/{booking_id}/approved-deliveries", response_model=List[DeliveryResponse], summary="List client approved deliveries")
def get_client_approved_deliveries(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return DeliveryService.get_client_approved_deliveries(db, current_user, booking_id)


@router.get("/freelancer/bookings/{booking_id}/deliveries", response_model=List[DeliveryResponse], summary="List freelancer project submission history")
def get_freelancer_deliveries(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return DeliveryService.get_freelancer_deliveries(db, current_user, booking_id)


@router.post("/freelancer/bookings/{booking_id}/deliveries", response_model=DeliveryResponse, status_code=status.HTTP_201_CREATED, summary="Submit preview or final delivery package")
def submit_delivery(
    booking_id: int,
    payload: DeliveryCreatePayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return DeliveryService.submit_delivery(
        db,
        current_user,
        booking_id,
        payload.title,
        payload.message,
        payload.file_ids,
        payload.delivery_type
    )


@router.post("/admin/deliveries/{delivery_id}/approve", response_model=DeliveryResponse, summary="Approve delivery submission and curate for client")
def admin_approve_delivery(
    delivery_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return DeliveryService.admin_approve_delivery(db, current_user, delivery_id)


@router.post("/admin/deliveries/{delivery_id}/request-changes", response_model=DeliveryResponse, summary="Request delivery changes from freelancer")
def admin_request_changes(
    delivery_id: int,
    payload: AdminRequestChangesPayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return DeliveryService.admin_request_changes(db, current_user, delivery_id, payload.feedback)


@router.post("/client/deliveries/{delivery_id}/revision", response_model=RevisionRequestResponse, status_code=status.HTTP_201_CREATED, summary="Request revision on delivery submission")
def request_revision(
    delivery_id: int,
    payload: RevisionRequestCreatePayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return DeliveryService.request_revision(
        db,
        current_user,
        delivery_id,
        payload.title,
        payload.description
    )
