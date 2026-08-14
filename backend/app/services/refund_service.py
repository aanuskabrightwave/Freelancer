from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Dict, Any, List
from decimal import Decimal
from datetime import datetime

from app.models.user import User, UserRole
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment
from app.models.refund import Refund
from app.repositories.payment_repository import PaymentRepository
from app.repositories.booking_repository import BookingRepository
from app.repositories.ledger_repository import LedgerRepository
from app.services.payments.razorpay_provider import RazorpayProvider
from app.services.financial_service import FinancialService


class RefundService:
    @staticmethod
    def generate_refund_number(db: Session) -> str:
        # Simple count query
        from sqlalchemy import func
        count = db.query(func.count(Refund.id)).scalar() or 0
        return f"REF-2026-{count + 1:06d}"

    @staticmethod
    def request_client_refund(db: Session, user: User, booking_id: int, reason: str) -> Refund:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking or booking.client_id != user.id:
            raise HTTPException(status_code=403, detail="Unauthorized client request.")

        payment = PaymentRepository.get_by_booking_id(db, booking_id)
        if not payment or payment.status != "CAPTURED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No successful payment captures found to refund."
            )

        # Check existing non-failed refunds
        existing = db.query(Refund).filter(
            Refund.payment_id == payment.id,
            Refund.status != "FAILED"
        ).first()
        if existing:
            raise HTTPException(status_code=400, detail="A refund request has already been logged for this payment.")

        refund_number = RefundService.generate_refund_number(db)
        
        refund_data = {
            "refund_number": refund_number,
            "payment_id": payment.id,
            "booking_id": booking.id,
            "provider": "RAZORPAY",
            "amount": payment.gross_amount,
            "reason": reason,
            "requested_by": "CLIENT",
            "status": "REQUESTED"
        }
        db_refund = Refund(**refund_data)
        db.add(db_refund)
        db.commit()
        db.refresh(db_refund)
        return db_refund

    @staticmethod
    def execute_admin_refund(db: Session, user: User, payment_id: int, amount: Decimal, reason: str) -> Refund:
        if user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Only admins can execute refunds.")

        payment = PaymentRepository.get_by_id(db, payment_id)
        if not payment or payment.status != "CAPTURED":
            raise HTTPException(status_code=400, detail="Target payment capture match not found.")

        # Validate refund bounds
        # Sum already processed refunds
        from sqlalchemy import func
        sum_processed = db.query(func.sum(Refund.amount)).filter(
            Refund.payment_id == payment_id,
            Refund.status == "PROCESSED"
        ).scalar() or Decimal("0.00")

        remaining = payment.gross_amount - sum_processed
        if amount <= 0 or amount > remaining:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Refund request bounds invalid. Remaining refundable: ₹{remaining:,}"
            )

        provider = RazorpayProvider()
        refund_number = RefundService.generate_refund_number(db)

        # Provider API call
        rzp_refund = provider.create_refund(
            payment.provider_payment_id,
            amount,
            refund_number
        )

        refund_data = {
            "refund_number": refund_number,
            "payment_id": payment.id,
            "booking_id": payment.booking_id,
            "provider": "RAZORPAY",
            "provider_refund_id": rzp_refund["id"],
            "amount": amount,
            "reason": reason,
            "requested_by": "ADMIN",
            "status": "PROCESSED",
            "processed_at": datetime.now()
        }
        refund = Refund(**refund_data)
        db.add(refund)

        # 1. Update Payment status
        if amount == remaining:
            payment.status = "REFUNDED"
        else:
            payment.status = "PARTIALLY_REFUNDED"

        # 2. Insert debit ledger entries to reverse earning distributions
        # Gross refund amount split: reverse platform commission and freelancer payout shares
        splits = FinancialService.calculate_splits(amount)

        # Freelancer debit share
        free_debit = {
            "user_id": payment.client_id,
            "freelancer_profile_id": payment.freelancer_profile_id,
            "booking_id": payment.booking_id,
            "payment_id": payment.id,
            "refund_id": refund.id,
            "entry_type": "REFUND",
            "amount": -splits["freelancer_amount"],
            "currency": payment.currency,
            "status": "AVAILABLE",  # immediately debits available balances
            "description": f"Deduct freelancer share for refund: {refund_number}"
        }
        LedgerRepository.create(db, free_debit)

        # Platform commission reverse share (negative of a negative platforms credit is positive debit)
        comm_debit = {
            "user_id": None,
            "freelancer_profile_id": payment.freelancer_profile_id,
            "booking_id": payment.booking_id,
            "payment_id": payment.id,
            "refund_id": refund.id,
            "entry_type": "REFUND_REVERSAL",
            "amount": -splits["platform_fee_amount"],
            "currency": payment.currency,
            "status": "AVAILABLE",
            "description": f"Reverse platform commission for refund: {refund_number}"
        }
        LedgerRepository.create(db, comm_debit)

        db.commit()
        db.refresh(refund)

        # Trigger refund processed notification to client
        try:
            from app.services.notification_service import NotificationService
            NotificationService.dispatch(
                db=db,
                recipient_id=payment.client_id,
                event_code="REFUND_PROCESSED",
                title="Refund Processed",
                message=f"A refund of ₹{int(amount):,} has been processed for booking '{payment.booking.booking_number}'.",
                action_url=f"/client/bookings/{payment.booking_id}",
                entity_type="refund",
                entity_id=refund.id,
                deduplication_key=f"refund:{refund.id}:processed:client:{payment.client_id}",
                payload_meta={
                    "booking_number": payment.booking.booking_number,
                    "amount": str(int(amount)),
                    "booking_id": payment.booking_id
                }
            )
        except Exception as e:
            import logging
            logging.getLogger("refund_service").exception("Refund notification failed")

        return refund
