from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Dict, Any, Optional
from datetime import datetime
import uuid
import hashlib

from app.models.booking import Booking, BookingStatus
from app.models.user import User, UserRole
from app.models.payment import Payment, PaymentAttempt, PaymentWebhookEvent
from app.repositories.booking_repository import BookingRepository
from app.repositories.payment_repository import PaymentRepository
from app.repositories.ledger_repository import LedgerRepository
from app.services.payments.razorpay_provider import RazorpayProvider
from app.services.financial_service import FinancialService
from app.services.workspace_service import WorkspaceService
from app.models.workspace_event import WorkspaceEventType


class PaymentService:
    @staticmethod
    def generate_payment_number(db: Session) -> str:
        count = PaymentRepository.get_total_payments_count(db)
        return f"PAY-2026-{count + 1:06d}"

    @staticmethod
    def create_payment_order(db: Session, user: User, booking_id: int) -> Dict[str, Any]:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        # Security check: only booking client owner can pay
        if booking.client_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the client owner of this booking can initiate payment."
            )

        if booking.status == BookingStatus.CANCELLED:
            raise HTTPException(status_code=400, detail="Cannot pay for a cancelled booking.")

        # Check existing payment
        existing_payment = PaymentRepository.get_by_booking_id(db, booking_id)
        if existing_payment and existing_payment.status == "CAPTURED":
            raise HTTPException(status_code=400, detail="This booking has already been paid.")

        if booking.agreed_amount <= 0:
            raise HTTPException(status_code=400, detail="Booking agreed amount must be greater than zero.")

        # Financial split splits
        splits = FinancialService.calculate_splits(booking.agreed_amount)

        # Generate unique number
        payment_number = PaymentService.generate_payment_number(db)
        provider = RazorpayProvider()

        # Create Razorpay Order
        rzp_order = provider.create_order(payment_number, booking.agreed_amount)
        provider_order_id = rzp_order["id"]

        payment_data = {
            "payment_number": payment_number,
            "booking_id": booking.id,
            "client_id": booking.client_id,
            "freelancer_profile_id": booking.freelancer_profile_id,
            "provider": "RAZORPAY",
            "provider_order_id": provider_order_id,
            "gross_amount": splits["gross_amount"],
            "platform_fee_amount": splits["platform_fee_amount"],
            "freelancer_amount": splits["freelancer_amount"],
            "commission_percent_snapshot": splits["commission_percent"],
            "status": "CREATED"
        }
        
        # Save payment details
        payment = PaymentRepository.create(db, payment_data)

        # Create attempt log
        attempt_data = {
            "payment_id": payment.id,
            "provider_order_id": provider_order_id,
            "status": "CREATED"
        }
        PaymentRepository.create_attempt(db, attempt_data)

        return {
            "payment_number": payment_number,
            "provider": "RAZORPAY",
            "provider_order_id": provider_order_id,
            "amount": rzp_order["amount"],  # in paise
            "currency": "INR",
            "razorpay_key_id": provider.key_id
        }

    @staticmethod
    def verify_payment_signature(db: Session, user: User, booking_id: int, payload: Dict[str, Any]) -> Payment:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking or booking.client_id != user.id:
            raise HTTPException(status_code=403, detail="Unauthorized client verification request.")

        order_id = payload.get("razorpay_order_id", "")
        payment = PaymentRepository.get_by_provider_order_id(db, order_id)
        if not payment or payment.booking_id != booking_id:
            raise HTTPException(status_code=404, detail="Payment order match not found.")

        # Signature check
        provider = RazorpayProvider()
        is_valid = provider.verify_payment(payload)
        if not is_valid:
            # Mark attempt as failed
            attempt_data = {
                "payment_id": payment.id,
                "provider_order_id": order_id,
                "provider_payment_id": payload.get("razorpay_payment_id"),
                "status": "FAILED",
                "failure_code": "BAD_SIGNATURE"
            }
            PaymentRepository.create_attempt(db, attempt_data)
            
            payment.status = "FAILED"
            payment.failure_code = "BAD_SIGNATURE"
            payment.failure_description = "Returned signature mismatch."
            db.commit()
            raise HTTPException(status_code=400, detail="Invalid payment signature returned.")

        # Process successful capture
        PaymentService.mark_payment_captured(db, payment, payload.get("razorpay_payment_id"), "verify_signature")
        return payment

    @staticmethod
    def mark_payment_captured(db: Session, payment: Payment, provider_payment_id: str, source: str) -> None:
        """
        Idempotent capture confirmation.
        Updates status, creates ledger entries, and updates workspace events timeline.
        """
        if payment.status == "CAPTURED":
            return  # Already processed

        payment.status = "CAPTURED"
        payment.provider_payment_id = provider_payment_id
        payment.paid_at = datetime.now()

        # 1. Update Booking status or metadata
        # We can record the booking as paid. Since we shouldn't overload status, we track paid via payment records.
        # But we also add workspace notification event!
        workspace = WorkspaceService.get_or_create_workspace(db, payment.client, payment.booking_id)

        # Log system event
        WorkspaceService.log_workspace_event(
            db,
            workspace_id=workspace.id,
            event_type=WorkspaceEventType.MESSAGE_SYSTEM,
            actor_user_id=None,
            title="Payment Completed",
            description=f"Client payment of ₹{int(payment.gross_amount):,} completed successfully via {payment.provider}."
        )

        # 2. Setup Ledger audit entries (freelancer credit & platform commission debit)
        # Payment Credit Entry
        credit_data = {
            "user_id": payment.client_id,
            "freelancer_profile_id": payment.freelancer_profile_id,
            "booking_id": payment.booking_id,
            "payment_id": payment.id,
            "entry_type": "PAYMENT_CREDIT",
            "amount": payment.gross_amount,
            "currency": payment.currency,
            "status": "PENDING",
            "description": f"Credit gross amount for booking: {payment.booking.booking_number}"
        }
        LedgerRepository.create(db, credit_data)

        # Platform Commission Entry (recorded as negative amount)
        debit_data = {
            "user_id": None,
            "freelancer_profile_id": payment.freelancer_profile_id,
            "booking_id": payment.booking_id,
            "payment_id": payment.id,
            "entry_type": "PLATFORM_COMMISSION",
            "amount": -payment.platform_fee_amount,
            "currency": payment.currency,
            "status": "PENDING",
            "description": f"Deduct platform commission snapshot {payment.commission_percent_snapshot}%"
        }
        LedgerRepository.create(db, debit_data)

        # Add successful attempt log
        attempt_data = {
            "payment_id": payment.id,
            "provider_order_id": payment.provider_order_id,
            "provider_payment_id": provider_payment_id,
            "status": "CAPTURED"
        }
        PaymentRepository.create_attempt(db, attempt_data)

        db.commit()

    @staticmethod
    def handle_webhook(db: Session, raw_body: bytes, signature: str) -> None:
        """
        Secures and validates webhook events idempotently.
        """
        provider = RazorpayProvider()
        is_valid = provider.verify_webhook_signature(raw_body, signature)
        if not is_valid:
            raise HTTPException(status_code=400, detail="Webhook signature mismatch.")

        # Parse payload
        import json
        try:
            data = json.loads(raw_body.decode("utf-8"))
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid webhook JSON body.")

        event_id = data.get("created_at")  # fallback or real event id
        # Razorpay sends 'id' as event id e.g. "evt_XXXXX"
        event_id = data.get("id", f"evt_{hash(raw_body)}")
        event_type = data.get("event", "")

        # Check webhook idempotency
        existing_event = PaymentRepository.get_webhook_event(db, event_id)
        if existing_event and existing_event.processed:
            return  # Already handled

        # Record webhook event
        webhook_data = {
            "provider": "RAZORPAY",
            "provider_event_id": event_id,
            "event_type": event_type,
            "payload_hash": hashlib.md5(raw_body).hexdigest(),
            "processed": False
        }
        db_evt = PaymentRepository.create_webhook_event(db, webhook_data)

        try:
            # Process events
            if event_type == "payment.captured":
                payment_payload = data["payload"]["payment"]["entity"]
                order_id = payment_payload.get("order_id", "")
                payment_id = payment_payload.get("id", "")

                payment = PaymentRepository.get_by_provider_order_id(db, order_id)
                if payment:
                    PaymentService.mark_payment_captured(db, payment, payment_id, "webhook")
            
            db_evt.processed = True
            db_evt.processed_at = datetime.now()
            db.commit()

        except Exception as e:
            db_evt.processing_error = str(e)
            db.commit()
            raise e
