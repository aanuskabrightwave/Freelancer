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
    def get_payment_eligibility(db: Session, user: User, booking_id: int) -> Dict[str, Any]:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        user_role_str = user.role.value if hasattr(user.role, "value") else str(user.role)
        if user_role_str != "CLIENT":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only client accounts can initiate booking payments."
            )

        # Security check: only booking client owner can pay
        if booking.client_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only the client owner of this booking can initiate payment."
            )

        if booking.status in [BookingStatus.CANCELLED, BookingStatus.REJECTED]:
            return {
                "booking_id": booking.id,
                "total_amount": float(booking.agreed_amount),
                "amount_paid": float(booking.total_paid),
                "remaining_amount": float(booking.remaining_balance),
                "payment_stage": "UNKNOWN",
                "can_pay": False,
                "blocking_reason": f"Cannot pay for a {booking.status.value.lower()} booking."
            }

        # Calculate deposit amount if unset
        if (not booking.deposit_amount or booking.deposit_amount <= 0) and booking.agreed_amount > 0:
            from decimal import Decimal
            booking.deposit_amount = (booking.agreed_amount * Decimal("0.30")).quantize(Decimal("0.01"))
            db.commit()

        charge_amount = booking.remaining_balance
        payment_type_val = "UNKNOWN"
        can_pay = False
        blocking_reason = None

        if booking.payment_completion_state == "UNPAID":
            payment_type_val = "DEPOSIT"
            charge_amount = booking.deposit_amount
            # Enforce that DEPOSIT can only be paid when Freelancer has accepted and booking status is CONFIRMED
            if booking.status not in [BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]:
                can_pay = False
                if booking.status == BookingStatus.REQUESTED:
                    blocking_reason = "Payment deposit is not available while booking request is pending admin review."
                elif booking.status == BookingStatus.MATCHING_IN_PROGRESS:
                    blocking_reason = "Payment deposit is available only after freelancer accepts assignment and booking is confirmed."
                else:
                    blocking_reason = f"Payment deposit is not available for current booking status ({booking.status.value})."
            else:
                can_pay = True
        elif booking.payment_completion_state == "DEPOSIT_PAID":
            payment_type_val = "FINAL_BALANCE"
            charge_amount = booking.remaining_balance

            from app.models.delivery import Delivery, DeliveryStatus
            approved_delivery = db.query(Delivery).filter(
                Delivery.booking_id == booking.id,
                Delivery.status == DeliveryStatus.APPROVED,
                Delivery.shared_with_client_at.isnot(None)
            ).first()

            if not approved_delivery:
                can_pay = False
                blocking_reason = "Final balance payment is available only after Admin reviews and approves the project delivery."
            else:
                can_pay = True
        else:
            can_pay = False
            blocking_reason = "This booking has already been fully paid."

        if can_pay and charge_amount <= 0:
            can_pay = False
            blocking_reason = "Payment amount must be greater than zero."

        return {
            "booking_id": booking.id,
            "total_amount": float(booking.agreed_amount),
            "amount_paid": float(booking.total_paid),
            "remaining_amount": float(charge_amount),
            "payment_stage": payment_type_val,
            "can_pay": can_pay,
            "blocking_reason": blocking_reason
        }

    @staticmethod
    def create_payment_order(db: Session, user: User, booking_id: int) -> Dict[str, Any]:
        eligibility = PaymentService.get_payment_eligibility(db, user, booking_id)
        if not eligibility["can_pay"]:
            raise HTTPException(status_code=400, detail=eligibility["blocking_reason"] or "Payment not eligible")
            
        booking = BookingRepository.get_by_id(db, booking_id)
        charge_amount = booking.deposit_amount if eligibility["payment_stage"] == "DEPOSIT" else booking.remaining_balance
        payment_type_val = eligibility["payment_stage"]

        # Check for existing CREATED order to prevent duplicates
        existing_payment = db.query(Payment).filter(
            Payment.booking_id == booking.id,
            Payment.payment_type == payment_type_val,
            Payment.status == "CREATED"
        ).first()

        if existing_payment:
            return {
                "payment_number": existing_payment.payment_number,
                "provider": "RAZORPAY",
                "provider_order_id": existing_payment.provider_order_id,
                "amount": int(existing_payment.gross_amount * 100),  # in paise
                "currency": "INR",
                "razorpay_key_id": RazorpayProvider().key_id
            }

        # Financial split splits based on charge amount
        splits = FinancialService.calculate_splits(charge_amount)

        # Generate unique number
        payment_number = PaymentService.generate_payment_number(db)
        provider = RazorpayProvider()

        # Create Razorpay Order
        rzp_order = provider.create_order(payment_number, charge_amount)
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
            "status": "CREATED",
            "payment_type": payment_type_val
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
            
            # Trigger PAYMENT_FAILED notification to client
            try:
                from app.services.notification_service import NotificationService
                NotificationService.dispatch(
                    db=db,
                    recipient_id=payment.client_id,
                    event_code="PAYMENT_FAILED",
                    title="Payment Failed",
                    message=f"An attempt to capture payment for booking '{booking.booking_number}' failed.",
                    action_url=f"/client/bookings/{booking.id}/payment",
                    entity_type="payment",
                    entity_id=payment.id,
                    deduplication_key=f"payment:{payment.id}:failed:client:{payment.client_id}",
                    payload_meta={
                        "booking_number": booking.booking_number,
                        "amount": str(int(payment.gross_amount)),
                        "booking_id": booking.id
                    }
                )
            except Exception as e:
                import logging
                logging.getLogger("payment_service").exception("Payment failure notification failed")

            raise HTTPException(status_code=400, detail="Invalid payment signature returned.")

        try:
            # Process successful capture
            PaymentService.mark_payment_captured(db, payment, payload.get("razorpay_payment_id"), "verify_signature")
        except HTTPException:
            raise
        except Exception as e:
            db.rollback()
            raise HTTPException(status_code=500, detail=f"Database transaction failed: {str(e)}")

        return payment

    @staticmethod
    def mark_payment_captured(db: Session, payment: Payment, provider_payment_id: str, source: str) -> None:
        """
        Idempotent capture confirmation.
        Updates status, creates ledger entries, and updates workspace events timeline.
        """
        payment = db.query(Payment).filter(Payment.id == payment.id).with_for_update().first()
        if not payment or payment.status == "CAPTURED":
            return  # Already processed

        payment.status = "CAPTURED"
        payment.provider_payment_id = provider_payment_id
        payment.paid_at = datetime.now()

        # 1. Update Booking status or metadata
        from decimal import Decimal
        booking = payment.booking
        if payment.payment_type == "DEPOSIT":
            booking.deposit_paid_amount = payment.gross_amount
            booking.total_paid = booking.total_paid + payment.gross_amount
            booking.remaining_balance = booking.agreed_amount - booking.total_paid
            booking.payment_completion_state = "DEPOSIT_PAID"
            booking.status = BookingStatus.CONFIRMED
            booking.confirmed_at = datetime.now()
        else:  # FINAL_BALANCE or FULL
            booking.total_paid = booking.agreed_amount
            booking.remaining_balance = Decimal("0.00")
            booking.payment_completion_state = "FULLY_PAID"
            booking.status = BookingStatus.COMPLETED
            booking.completed_at = datetime.now()

        client_user = payment.client
        if not client_user:
            from app.models.user import User
            client_user = db.query(User).filter(User.id == payment.client_id).first()

        workspace = WorkspaceService.get_or_create_workspace(db, client_user, payment.booking_id)

        # Log system event
        WorkspaceService.log_workspace_event(
            db,
            workspace_id=workspace.id,
            event_type=WorkspaceEventType.MESSAGE_SYSTEM,
            actor_user_id=None,
            title=f"Payment ({payment.payment_type}) Completed",
            description=f"Client payment of ₹{int(payment.gross_amount):,} completed successfully via {payment.provider}."
        )

        # 2. Setup Ledger audit entries (freelancer credit & platform commission debit)
        # Payment Credit Entry
        credit_entry_type = "ADVANCE_CREDIT" if payment.payment_type == "DEPOSIT" else "FINAL_CREDIT"
        credit_data = {
            "user_id": payment.client_id,
            "freelancer_profile_id": payment.freelancer_profile_id,
            "booking_id": payment.booking_id,
            "payment_id": payment.id,
            "entry_type": credit_entry_type,
            "amount": payment.gross_amount,
            "currency": payment.currency,
            "status": "PENDING",
            "description": f"Advance deposit credit for booking: {payment.booking.booking_number}" if payment.payment_type == "DEPOSIT" else f"Final balance credit for booking: {payment.booking.booking_number}"
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

        # If booking is fully paid, transition all pending ledger entries for this booking to AVAILABLE for payout
        if booking.payment_completion_state == "FULLY_PAID":
            from app.models.ledger import LedgerEntry
            pending_entries = db.query(LedgerEntry).filter(
                LedgerEntry.booking_id == booking.id,
                LedgerEntry.status == "PENDING"
            ).all()
            for entry in pending_entries:
                entry.status = "AVAILABLE"

        # Add successful attempt log
        attempt_data = {
            "payment_id": payment.id,
            "provider_order_id": payment.provider_order_id,
            "provider_payment_id": provider_payment_id,
            "status": "CAPTURED"
        }
        PaymentRepository.create_attempt(db, attempt_data)

        db.commit()

        # Trigger notification to client & freelancer (idempotently via deduplication keys)
        try:
            from app.services.notification_service import NotificationService
            from app.repositories.freelancer_repository import FreelancerRepository
            freelancer_profile = FreelancerRepository.get_profile_by_id(db, payment.freelancer_profile_id)
            
            # 1. Notify Client
            NotificationService.dispatch(
                db=db,
                recipient_id=payment.client_id,
                event_code="PAYMENT_SUCCESS",
                title="Payment Successful",
                message=f"Your payment of ₹{int(payment.gross_amount):,} for booking '{payment.booking.booking_number}' was successful.",
                action_url=f"/client/bookings/{payment.booking_id}",
                entity_type="payment",
                entity_id=payment.id,
                deduplication_key=f"payment:{payment.id}:captured:client:{payment.client_id}",
                payload_meta={
                    "payment_number": payment.payment_number,
                    "booking_number": payment.booking.booking_number,
                    "amount": str(int(payment.gross_amount)),
                    "booking_id": payment.booking_id
                }
            )

            # 2. Notify Freelancer
            NotificationService.dispatch(
                db=db,
                recipient_id=freelancer_profile.user_id,
                event_code="PAYMENT_SUCCESS", # Map to payment update email trigger category
                title="Payment Secured",
                message=f"The client payment for booking '{payment.booking.booking_number}' has been confirmed.",
                action_url=f"/freelancer/bookings/{payment.booking_id}",
                entity_type="payment",
                entity_id=payment.id,
                deduplication_key=f"payment:{payment.id}:captured:freelancer:{freelancer_profile.user_id}",
                payload_meta={
                    "payment_number": payment.payment_number,
                    "booking_number": payment.booking.booking_number,
                    "amount": str(int(payment.gross_amount)),
                    "booking_id": payment.booking_id
                }
            )
        except Exception as e:
            import logging
            logging.getLogger("payment_service").exception("Payment success notification failed")

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
