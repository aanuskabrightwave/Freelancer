import os
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Dict, Any, List, Optional
from decimal import Decimal
from datetime import datetime

from app.models.user import User
from app.models.booking import Booking, BookingStatus
from app.models.payout import Payout
from app.models.payout_account import FreelancerPayoutAccount
from app.models.ledger import LedgerEntry
from app.repositories.freelancer_repository import FreelancerRepository
from app.repositories.payout_repository import PayoutRepository
from app.repositories.ledger_repository import LedgerRepository
from app.services.financial_service import FinancialService
from app.services.payments.razorpay_provider import RazorpayProvider


class PayoutService:
    @staticmethod
    def get_minimum_payout_amount() -> Decimal:
        val = os.getenv("MINIMUM_PAYOUT_AMOUNT", "500")
        return Decimal(val)

    @staticmethod
    def generate_payout_number(db: Session) -> str:
        count = PayoutRepository.get_total_payouts_count(db)
        return f"PO-2026-{count + 1:06d}"

    @staticmethod
    def link_payout_account(
        db: Session,
        user: User,
        provider_account_id: str,
        account_holder_name: Optional[str] = None,
        account_type: str = "bank_account"
    ) -> FreelancerPayoutAccount:
        profile = FreelancerRepository.get_profile_by_user_id(db, user.id)
        if not profile:
            raise HTTPException(status_code=404, detail="Freelancer profile not found.")

        existing = PayoutRepository.get_account_by_freelancer_id(db, profile.id)
        if existing:
            existing.provider_account_id = provider_account_id
            existing.account_holder_name = account_holder_name or existing.account_holder_name
            existing.account_type = account_type
            existing.status = "VERIFIED"
            db.commit()
            db.refresh(existing)
            return existing

        account_data = {
            "freelancer_profile_id": profile.id,
            "provider": "RAZORPAY",
            "provider_account_id": provider_account_id,
            "account_holder_name": account_holder_name,
            "account_type": account_type,
            "status": "VERIFIED"
        }
        return PayoutRepository.create_payout_account(db, account_data)

    @staticmethod
    def get_earnings_summary(db: Session, user: User) -> Dict[str, Any]:
        profile = FreelancerRepository.get_profile_by_user_id(db, user.id)
        if not profile:
            raise HTTPException(status_code=404, detail="Freelancer profile not found.")
        return LedgerRepository.get_freelancer_summary(db, profile.id)

    @staticmethod
    def get_earnings_transactions(db: Session, user: User) -> List[LedgerEntry]:
        profile = FreelancerRepository.get_profile_by_user_id(db, user.id)
        if not profile:
            raise HTTPException(status_code=404, detail="Freelancer profile not found.")
        return LedgerRepository.get_freelancer_entries(db, profile.id)

    @staticmethod
    def get_payouts(db: Session, user: User) -> List[Payout]:
        profile = FreelancerRepository.get_profile_by_user_id(db, user.id)
        if not profile:
            raise HTTPException(status_code=404, detail="Freelancer profile not found.")
        return PayoutRepository.get_payouts_by_freelancer_id(db, profile.id)

    @staticmethod
    def process_available_payouts(db: Session) -> None:
        """
        Background/system runner scans and matures pending credits.
        Changes pending credits to AVAILABLE if hold duration is complete and booking completed.
        """
        # Fetch pending credits
        pending_entries = db.query(LedgerEntry).filter(
            LedgerEntry.status == "PENDING"
        ).all()

        for entry in pending_entries:
            if not entry.booking:
                continue

            db.refresh(entry.booking)

            if entry.booking.status == BookingStatus.COMPLETED:
                completed_at = entry.booking.completed_at or entry.booking.updated_at
                availability_date = FinancialService.calculate_availability_date(completed_at)
                if availability_date <= datetime.now():
                    entry.status = "AVAILABLE"

        db.commit()

    @staticmethod
    def initiate_payout(db: Session, user: User, amount_requested: Optional[Decimal] = None) -> Payout:
        # Pre-process pending ledger maturation
        PayoutService.process_available_payouts(db)

        profile = FreelancerRepository.get_profile_by_user_id(db, user.id)
        if not profile:
            raise HTTPException(status_code=404, detail="Freelancer profile not found.")

        # Check payout bank credentials verified
        account = PayoutRepository.get_account_by_freelancer_id(db, profile.id)
        if not account or account.status != "VERIFIED":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Payout bank account details not configured or verified."
            )

        summary = LedgerRepository.get_freelancer_summary(db, profile.id)
        available_balance = summary["available"]

        min_payout = PayoutService.get_minimum_payout_amount()
        
        # Determine payout total
        if amount_requested is not None:
            payout_amount = Decimal(amount_requested)
            if payout_amount < min_payout:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Requested payout amount ₹{payout_amount:,} is below minimum allowed ₹{min_payout:,}."
                )
            if payout_amount > available_balance:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Requested payout ₹{payout_amount:,} exceeds available balance ₹{available_balance:,}."
                )
        else:
            payout_amount = available_balance
            if payout_amount < min_payout:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Available payout balance ₹{payout_amount:,} is below minimum allowed ₹{min_payout:,}."
                )

        payout_number = PayoutService.generate_payout_number(db)
        provider = RazorpayProvider()

        # Route/linked transfer allocation
        # We can map transfer using default stub
        transfer = provider.create_transfer(
            payout_amount,
            account.provider_account_id,
            "pay_dummy_p1", # payment reference fallback
            payout_number
        )

        payout_data = {
            "payout_number": payout_number,
            "freelancer_profile_id": profile.id,
            "provider": "RAZORPAY",
            "provider_transfer_id": transfer["id"],
            "amount": payout_amount,
            "status": "PROCESSED",
            "initiated_at": datetime.now(),
            "processed_at": datetime.now()
        }
        payout = PayoutRepository.create_payout(db, payout_data)

        # Create Ledger Entry (debit recorded as negative amount)
        ledger_data = {
            "user_id": user.id,
            "freelancer_profile_id": profile.id,
            "booking_id": None,
            "payment_id": None,
            "payout_id": payout.id,
            "entry_type": "PAYOUT",
            "amount": -payout_amount,
            "currency": "INR",
            "status": "AVAILABLE",
            "description": f"Payout transfer: {payout_number}"
        }
        LedgerRepository.create(db, ledger_data)

        db.commit()
        return payout
