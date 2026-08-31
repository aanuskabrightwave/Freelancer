import logging
from datetime import datetime, timedelta
from typing import List, Optional
from sqlalchemy import desc, func
from sqlalchemy.orm import Session
from fastapi import BackgroundTasks
from app.models.notification import Notification, NotificationType
from app.models.notification_preferences import NotificationPreferences
from app.models.email_delivery import EmailDelivery
from app.services.email_service import EmailService

logger = logging.getLogger("notification_service")

# Map event code to main notification category
EVENT_TO_TYPE = {
    "PROJECT_PUBLISHED": NotificationType.PROJECT,
    "PROPOSAL_RECEIVED": NotificationType.PROPOSAL,
    "PROPOSAL_SHORTLISTED": NotificationType.PROPOSAL,
    "PROPOSAL_ACCEPTED": NotificationType.PROPOSAL,
    "PROPOSAL_REJECTED": NotificationType.PROPOSAL,
    "BOOKING_REQUESTED": NotificationType.BOOKING,
    "BOOKING_CONFIRMED": NotificationType.BOOKING,
    "BOOKING_REJECTED": NotificationType.BOOKING,
    "BOOKING_CANCELLED": NotificationType.BOOKING,
    "BOOKING_ASSIGNED": NotificationType.BOOKING,
    "ASSIGNMENT_ACCEPTED": NotificationType.BOOKING,
    "ASSIGNMENT_DECLINED": NotificationType.BOOKING,
    "ASSIGNMENT_COUNTERED": NotificationType.BOOKING,
    "REPLACEMENT_REQUESTED": NotificationType.BOOKING,
    "REPLACEMENT_APPROVED": NotificationType.BOOKING,
    "REPLACEMENT_REJECTED": NotificationType.BOOKING,
    "BOOKING_RESCHEDULE_REQUESTED": NotificationType.BOOKING,
    "BOOKING_RESCHEDULE_ACCEPTED": NotificationType.BOOKING,
    "BOOKING_RESCHEDULE_REJECTED": NotificationType.BOOKING,
    "BOOKING_STARTED": NotificationType.BOOKING,
    "MESSAGE_RECEIVED": NotificationType.MESSAGE,
    "PAYMENT_SUCCESS": NotificationType.PAYMENT,
    "PAYMENT_FAILED": NotificationType.PAYMENT,
    "REFUND_PROCESSED": NotificationType.PAYMENT,
    "DELIVERY_PREVIEW_SUBMITTED": NotificationType.DELIVERY,
    "REVISION_REQUESTED": NotificationType.REVISION,
    "REVISION_SUBMITTED": NotificationType.REVISION,
    "FINAL_DELIVERY_SUBMITTED": NotificationType.DELIVERY,
    "BOOKING_COMPLETED": NotificationType.BOOKING,
    "REVIEW_RECEIVED": NotificationType.REVIEW,
    "REVIEW_RESPONSE_RECEIVED": NotificationType.REVIEW,
    "PAYOUT_AVAILABLE": NotificationType.PAYOUT,
    "PAYOUT_PROCESSING": NotificationType.PAYOUT,
    "PAYOUT_PROCESSED": NotificationType.PAYOUT,
    "PAYOUT_FAILED": NotificationType.PAYOUT,
    "PROFILE_VERIFICATION_UPDATE": NotificationType.ACCOUNT,
    "SYSTEM_ANNOUNCEMENT": NotificationType.SYSTEM
}

# Map event code to specific preference toggle column on NotificationPreferences model
EVENT_TO_PREFERENCE_FIELD = {
    "PROJECT_PUBLISHED": "project_updates_email",
    "PROPOSAL_RECEIVED": "proposal_updates_email",
    "PROPOSAL_SHORTLISTED": "proposal_updates_email",
    "PROPOSAL_ACCEPTED": "proposal_updates_email",
    "PROPOSAL_REJECTED": "proposal_updates_email",
    "BOOKING_REQUESTED": "booking_updates_email",
    "BOOKING_CONFIRMED": "booking_updates_email",
    "BOOKING_REJECTED": "booking_updates_email",
    "BOOKING_CANCELLED": "booking_updates_email",
    "BOOKING_ASSIGNED": "booking_updates_email",
    "ASSIGNMENT_ACCEPTED": "booking_updates_email",
    "ASSIGNMENT_DECLINED": "booking_updates_email",
    "ASSIGNMENT_COUNTERED": "booking_updates_email",
    "REPLACEMENT_REQUESTED": "booking_updates_email",
    "REPLACEMENT_APPROVED": "booking_updates_email",
    "REPLACEMENT_REJECTED": "booking_updates_email",
    "BOOKING_RESCHEDULE_REQUESTED": "booking_updates_email",
    "BOOKING_RESCHEDULE_ACCEPTED": "booking_updates_email",
    "BOOKING_RESCHEDULE_REJECTED": "booking_updates_email",
    "BOOKING_STARTED": "booking_updates_email",
    "MESSAGE_RECEIVED": "message_email",
    "PAYMENT_SUCCESS": "payment_email",
    "PAYMENT_FAILED": "payment_email",
    "REFUND_PROCESSED": "payment_email",
    "DELIVERY_PREVIEW_SUBMITTED": "delivery_email",
    "REVISION_REQUESTED": "delivery_email",
    "REVISION_SUBMITTED": "delivery_email",
    "FINAL_DELIVERY_SUBMITTED": "delivery_email",
    "BOOKING_COMPLETED": "booking_updates_email",
    "REVIEW_RECEIVED": "review_email",
    "REVIEW_RESPONSE_RECEIVED": "review_email",
    "PAYOUT_AVAILABLE": "payout_email",
    "PAYOUT_PROCESSING": "payout_email",
    "PAYOUT_PROCESSED": "payout_email",
    "PAYOUT_FAILED": "payout_email"
}

CRITICAL_EVENTS = {
    "PAYMENT_FAILED",
    "PAYOUT_FAILED",
    "PROFILE_VERIFICATION_UPDATE",
    "SYSTEM_ANNOUNCEMENT"
}


class NotificationService:
    @staticmethod
    def get_or_create_default_preferences(db: Session, user_id: int) -> NotificationPreferences:
        prefs = db.query(NotificationPreferences).filter(NotificationPreferences.user_id == user_id).first()
        if not prefs:
            prefs = NotificationPreferences(
                user_id=user_id,
                in_app_enabled=True,
                email_enabled=True,
                project_updates_email=True,
                proposal_updates_email=True,
                booking_updates_email=True,
                message_email=True,
                payment_email=True,
                delivery_email=True,
                review_email=True,
                payout_email=True
            )
            db.add(prefs)
            db.commit()
            db.refresh(prefs)
        return prefs

    @staticmethod
    def update_preferences(db: Session, user_id: int, updates: dict) -> NotificationPreferences:
        prefs = NotificationService.get_or_create_default_preferences(db, user_id)
        for k, v in updates.items():
            if hasattr(prefs, k):
                setattr(prefs, k, v)
        db.commit()
        db.refresh(prefs)
        return prefs

    @staticmethod
    def dispatch(
        db: Session,
        recipient_id: int,
        event_code: str,
        title: str,
        message: str,
        action_url: Optional[str] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[int] = None,
        deduplication_key: Optional[str] = None,
        payload_meta: Optional[dict] = None,
        background_tasks: Optional[BackgroundTasks] = None
    ) -> Optional[Notification]:
        """
        Unified handler that checks deduplication, verifies user preferences,
        writes in-app notices, and enqueues transactional email jobs.
        """
        # 1. Deduplication check
        if deduplication_key:
            existing = db.query(Notification).filter(Notification.deduplication_key == deduplication_key).first()
            if existing:
                logger.info(f"Duplicate event skipped by deduplication_key: {deduplication_key}")
                return existing

        # Get recipient preferences
        prefs = NotificationService.get_or_create_default_preferences(db, recipient_id)

        # 2. Write In-App Notification (if enabled)
        db_notification = None
        if prefs.in_app_enabled:
            n_type = EVENT_TO_TYPE.get(event_code, NotificationType.SYSTEM)
            db_notification = Notification(
                user_id=recipient_id,
                notification_type=n_type,
                event_code=event_code,
                title=title,
                message=message,
                action_url=action_url,
                entity_type=entity_type,
                entity_id=entity_id,
                deduplication_key=deduplication_key,
                is_read=False
            )
            db.add(db_notification)
            db.commit()
            db.refresh(db_notification)

        # 3. Handle Transactional Email Dispatch
        is_critical = event_code in CRITICAL_EVENTS
        email_pref_enabled = True
        pref_field = EVENT_TO_PREFERENCE_FIELD.get(event_code)
        if pref_field and not getattr(prefs, pref_field):
            email_pref_enabled = False

        # Email can proceed if globally enabled AND either (it is critical OR specific pref toggle is true)
        should_send_email = prefs.email_enabled and (is_critical or email_pref_enabled)

        if should_send_email:
            notification_id = db_notification.id if db_notification else None
            email_payload = payload_meta or {}
            
            # Additional logic: message cooldown check
            if event_code == "MESSAGE_RECEIVED":
                cooldown_limit = datetime.utcnow() - timedelta(minutes=15)
                recent_delivery = db.query(EmailDelivery).filter(
                    EmailDelivery.user_id == recipient_id,
                    EmailDelivery.template_code == "MESSAGE_RECEIVED",
                    EmailDelivery.created_at >= cooldown_limit,
                    EmailDelivery.status != "FAILED"
                ).first()
                
                if recent_delivery:
                    # Log audit of suppressed email in deliveries table
                    suppressed_delivery = EmailDelivery(
                        user_id=recipient_id,
                        notification_id=notification_id,
                        recipient_email=email_payload.get("recipient_email", "unknown"),
                        template_code=event_code,
                        subject="New message received (Suppressed)",
                        status="SKIPPED",
                        failure_reason="Message email alert skipped due to 15-minute rate limit cooldown."
                    )
                    db.add(suppressed_delivery)
                    db.commit()
                    should_send_email = False

            if should_send_email:
                if background_tasks:
                    background_tasks.add_task(
                        EmailService.send_transactional_email_sync,
                        db, recipient_id, notification_id, event_code, email_payload
                    )
                else:
                    # Fallback synchronous if background worker is omitted (e.g. during script runs/tests)
                    EmailService.send_transactional_email_sync(
                        db, recipient_id, notification_id, event_code, email_payload
                    )

        return db_notification

    @staticmethod
    def get_user_notifications(
        db: Session,
        user_id: int,
        page: int = 1,
        page_size: int = 15,
        unread_only: bool = False,
        type_filter: Optional[str] = None
    ) -> List[Notification]:
        query = db.query(Notification).filter(Notification.user_id == user_id)
        
        if unread_only:
            query = query.filter(Notification.is_read == False)
        if type_filter:
            query = query.filter(Notification.notification_type == type_filter.upper())
            
        offset = (page - 1) * page_size
        return query.order_by(desc(Notification.created_at)).offset(offset).limit(page_size).all()

    @staticmethod
    def get_unread_count(db: Session, user_id: int) -> int:
        return db.query(func.count(Notification.id)).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).scalar() or 0

    @staticmethod
    def mark_as_read(db: Session, user_id: int, notification_id: int) -> Notification:
        notification = db.query(Notification).filter(
            Notification.id == notification_id,
            Notification.user_id == user_id
        ).first()
        if not notification:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Notification not found.")
            
        if not notification.is_read:
            notification.is_read = True
            notification.read_at = datetime.utcnow()
            db.commit()
            db.refresh(notification)
        return notification

    @staticmethod
    def mark_all_as_read(db: Session, user_id: int) -> None:
        db.query(Notification).filter(
            Notification.user_id == user_id,
            Notification.is_read == False
        ).update({
            "is_read": True,
            "read_at": datetime.utcnow()
        }, synchronize_session=False)
        db.commit()
