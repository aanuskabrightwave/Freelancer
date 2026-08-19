from datetime import datetime
from decimal import Decimal
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment
from app.models.refund import Refund
from app.models.dispute import Dispute, DisputeMessage, DisputeEvidence, DisputeReason, DisputeStatus, DisputePriority, ResolutionType
from app.models.user import User, UserRole
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService
from app.services.refund_service import RefundService


class DisputeService:
    @staticmethod
    def generate_dispute_number(db: Session) -> str:
        from sqlalchemy import func
        count = db.query(func.count(Dispute.id)).scalar() or 0
        return f"DSP-2026-{count + 1:06d}"

    @staticmethod
    def get_all_disputes(db: Session) -> List[Dispute]:
        return db.query(Dispute).order_by(Dispute.created_at.desc()).all()

    @staticmethod
    def get_dispute_by_id(db: Session, dispute_id: int) -> Dispute:
        d = db.query(Dispute).filter(Dispute.id == dispute_id).first()
        if not d:
            raise HTTPException(status_code=404, detail="Dispute not found.")
        return d

    @staticmethod
    def get_dispute_by_number(db: Session, num: str) -> Dispute:
        d = db.query(Dispute).filter(Dispute.dispute_number == num).first()
        if not d:
            raise HTTPException(status_code=404, detail="Dispute not found.")
        return d

    @staticmethod
    def open_dispute(
        db: Session,
        user: User,
        booking_id: int,
        reason: DisputeReason,
        description: str
    ) -> Dispute:
        # 1. Fetch booking
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found.")

        # 2. Verify participant
        is_client = booking.client_id == user.id
        is_freelancer = booking.freelancer.user_id == user.id if booking.freelancer else False

        if not is_client and not is_freelancer:
            raise HTTPException(status_code=403, detail="Only booking participants can open disputes.")

        # 2.5 Verify dispute window is active
        if not booking.dispute_window_ends_at:
            raise HTTPException(status_code=400, detail="Dispute window has not started yet. You must approve the final project first.")
        if datetime.now() > booking.dispute_window_ends_at:
            raise HTTPException(status_code=400, detail="The 48-hour dispute window has expired.")

        # 3. Verify duplicate protection
        existing = db.query(Dispute).filter(
            Dispute.booking_id == booking_id,
            Dispute.status.in_([DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW, DisputeStatus.WAITING_FOR_CLIENT, DisputeStatus.WAITING_FOR_FREELANCER])
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="An active dispute already exists for this booking.")

        # Resolve other participant user id
        against_id = booking.freelancer.user_id if is_client else booking.client_id

        dispute_number = DisputeService.generate_dispute_number(db)
        
        dispute = Dispute(
            dispute_number=dispute_number,
            booking_id=booking_id,
            opened_by_user_id=user.id,
            against_user_id=against_id,
            reason=reason,
            description=description,
            status=DisputeStatus.OPEN,
            priority=DisputePriority.NORMAL
        )
        db.add(dispute)
        db.commit()
        db.refresh(dispute)

        # Notify other party
        try:
            NotificationService.dispatch(
                db=db,
                recipient_id=against_id,
                event_code="DISPUTE_OPENED",
                title="Dispute Opened",
                message=f"A dispute has been opened against booking '{booking.booking_number}' for reason: {reason}.",
                action_url=f"/messages",  # Navigate to chats/workspace
                entity_type="dispute",
                entity_id=dispute.id,
                deduplication_key=f"dispute:{dispute.id}:opened:against:{against_id}"
            )
        except Exception:
            pass

        return dispute

    @staticmethod
    def assign_dispute(db: Session, admin_id: int, dispute_id: int) -> Dispute:
        d = DisputeService.get_dispute_by_id(db, dispute_id)
        
        d.assigned_admin_id = admin_id
        d.status = DisputeStatus.UNDER_REVIEW
        db.commit()
        db.refresh(d)

        # Log audit action
        AuditService.log_action(
            db=db,
            admin_user_id=admin_id,
            action="DISPUTE_ASSIGNED",
            entity_type="dispute",
            entity_id=d.id,
            description=f"Assigned dispute {d.dispute_number} to admin {admin_id}.",
            metadata_json={"dispute_id": d.id, "admin_id": admin_id}
        )

        return d

    @staticmethod
    def post_dispute_message(
        db: Session,
        user: User,
        dispute_id: int,
        message: str,
        is_internal_admin_note: bool = False
    ) -> DisputeMessage:
        d = DisputeService.get_dispute_by_id(db, dispute_id)

        # Verify permissions
        is_admin = user.role == UserRole.ADMIN
        is_participant = (d.opened_by_user_id == user.id) or (d.against_user_id == user.id)

        if not is_admin and not is_participant:
            raise HTTPException(status_code=403, detail="Access denied.")

        if is_internal_admin_note and not is_admin:
            raise HTTPException(status_code=403, detail="Only admins can record internal notes.")

        db_msg = DisputeMessage(
            dispute_id=dispute_id,
            sender_user_id=user.id,
            message=message,
            is_internal_admin_note=is_internal_admin_note
        )
        db.add(db_msg)
        db.commit()
        db.refresh(db_msg)
        return db_msg

    @staticmethod
    def add_dispute_evidence(
        db: Session,
        user: User,
        dispute_id: int,
        file_path: str,
        mime_type: str,
        description: Optional[str] = None
    ) -> DisputeEvidence:
        d = DisputeService.get_dispute_by_id(db, dispute_id)

        is_participant = (d.opened_by_user_id == user.id) or (d.against_user_id == user.id)
        if not is_participant and user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Access denied.")

        # Reject executable files
        blocked_exts = [".exe", ".bat", ".sh", ".cmd", ".com", ".scr", ".pif"]
        if any(file_path.lower().endswith(ext) for ext in blocked_exts):
            raise HTTPException(status_code=400, detail="Executable evidence uploads are blocked.")

        evidence = DisputeEvidence(
            dispute_id=dispute_id,
            uploaded_by_user_id=user.id,
            file_path=file_path,
            mime_type=mime_type,
            description=description
        )
        db.add(evidence)
        db.commit()
        db.refresh(evidence)
        return evidence

    @staticmethod
    def resolve_dispute(
        db: Session,
        admin_id: int,
        dispute_id: int,
        resolution_type: ResolutionType,
        resolution_notes: str,
        partial_refund_amount: Optional[Decimal] = None
    ) -> Dispute:
        d = DisputeService.get_dispute_by_id(db, dispute_id)
        if d.status == DisputeStatus.RESOLVED or d.status == DisputeStatus.CLOSED:
            raise HTTPException(status_code=400, detail="Dispute is already resolved/closed.")

        booking = d.booking
        if not booking:
            raise HTTPException(status_code=404, detail="Booking details match not found.")

        # Retrieve Payment record
        payment = db.query(Payment).filter(Payment.booking_id == booking.id, Payment.status == "CAPTURED").first()

        # Handle resolution flows
        if resolution_type in (ResolutionType.FULL_REFUND, ResolutionType.PARTIAL_REFUND):
            if not payment:
                raise HTTPException(status_code=400, detail="Captured successful payment not found to resolve refund.")

            # Validate refund sums
            from sqlalchemy import func
            sum_processed = db.query(func.sum(Refund.amount)).filter(
                Refund.payment_id == payment.id,
                Refund.status == "PROCESSED"
            ).scalar() or Decimal("0.00")

            remaining = payment.gross_amount - sum_processed

            if resolution_type == ResolutionType.FULL_REFUND:
                refund_amount = remaining
            else:
                if partial_refund_amount is None:
                    raise HTTPException(status_code=400, detail="Partial refund amount is required.")
                refund_amount = Decimal(partial_refund_amount)
                if refund_amount <= 0 or refund_amount > remaining:
                    raise HTTPException(
                        status_code=400,
                        detail=f"Refund request bounds invalid. Remaining refundable: ₹{remaining:,}"
                    )

            # Trigger refund
            admin_user = db.query(User).filter(User.id == admin_id).first()
            RefundService.execute_admin_refund(
                db=db,
                user=admin_user,
                payment_id=payment.id,
                amount=refund_amount,
                reason=f"Dispute {d.dispute_number} resolution: {resolution_notes}"
            )

        elif resolution_type == ResolutionType.BOOKING_CANCELLED:
            booking.status = BookingStatus.CANCELLED
            booking.cancelled_at = datetime.now()
            booking.cancelled_by = "ADMIN"
            booking.cancellation_reason = f"Resolved via dispute {d.dispute_number}"

        # Update dispute flags
        d.status = DisputeStatus.RESOLVED
        d.resolution_type = resolution_type
        d.resolution_notes = resolution_notes
        d.resolved_at = datetime.now()
        db.commit()
        db.refresh(d)

        # Log audit action
        AuditService.log_action(
            db=db,
            admin_user_id=admin_id,
            action="DISPUTE_RESOLVED",
            entity_type="dispute",
            entity_id=d.id,
            description=f"Resolved dispute {d.dispute_number} as '{resolution_type}'",
            metadata_json={
                "dispute_number": d.dispute_number,
                "resolution_type": resolution_type,
                "partial_refund_amount": str(partial_refund_amount) if partial_refund_amount else None
            }
        )

        # Notify participants
        for user_id in (d.opened_by_user_id, d.against_user_id):
            try:
                NotificationService.dispatch(
                    db=db,
                    recipient_id=user_id,
                    event_code="DISPUTE_RESOLVED",
                    title="Dispute Resolved",
                    message=f"Dispute '{d.dispute_number}' has been resolved: {resolution_type}.",
                    action_url=f"/notifications",
                    entity_type="dispute",
                    entity_id=d.id,
                    deduplication_key=f"dispute:{d.id}:resolved:user:{user_id}"
                )
            except Exception:
                pass

        return d
