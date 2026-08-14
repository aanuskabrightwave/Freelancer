from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.services.notification_service import NotificationService
from app.schemas.notification import (
    NotificationOut,
    NotificationPreferencesOut,
    NotificationPreferencesUpdate
)

router = APIRouter()


@router.get("/notifications", response_model=List[NotificationOut], summary="List paginated in-app notifications for active user")
def list_my_notifications(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    unread_only: bool = Query(False),
    type: Optional[str] = Query(None, description="ACCOUNT, PROJECT, PROPOSAL, BOOKING, MESSAGE, PAYMENT, DELIVERY, REVISION, REVIEW, PAYOUT, SYSTEM"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return NotificationService.get_user_notifications(
        db, current_user.id, page, page_size, unread_only, type
    )


@router.get("/notifications/unread-count", summary="Get count of unread notifications")
def get_my_unread_count(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    count = NotificationService.get_unread_count(db, current_user.id)
    return {"count": count}


@router.post("/notifications/{id}/read", response_model=NotificationOut, summary="Mark a single notification as read")
def mark_notification_as_read(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return NotificationService.mark_as_read(db, current_user.id, id)


@router.post("/notifications/read-all", status_code=status.HTTP_204_NO_CONTENT, summary="Mark all user notifications as read")
def mark_all_notifications_as_read(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    NotificationService.mark_all_as_read(db, current_user.id)
    return None


@router.get("/notifications/preferences", response_model=NotificationPreferencesOut, summary="Get user notification preferences settings")
def get_my_preferences(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return NotificationService.get_or_create_default_preferences(db, current_user.id)


@router.patch("/notifications/preferences", response_model=NotificationPreferencesOut, summary="Update notification preferences toggles")
def update_my_preferences(
    payload: NotificationPreferencesUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Exclude unset fields so we only modify what is provided
    updates = payload.model_dump(exclude_unset=True)
    return NotificationService.update_preferences(db, current_user.id, updates)
