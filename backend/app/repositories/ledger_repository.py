from typing import List, Dict, Any
from sqlalchemy.orm import Session
from sqlalchemy import func
from decimal import Decimal
from app.models.ledger import LedgerEntry


class LedgerRepository:
    @staticmethod
    def create(db: Session, entry_data: dict) -> LedgerEntry:
        db_entry = LedgerEntry(**entry_data)
        db.add(db_entry)
        db.commit()
        db.refresh(db_entry)
        return db_entry

    @staticmethod
    def get_freelancer_entries(db: Session, freelancer_id: int) -> List[LedgerEntry]:
        return db.query(LedgerEntry).filter(LedgerEntry.freelancer_profile_id == freelancer_id).order_by(LedgerEntry.created_at.desc()).all()

    @staticmethod
    def get_freelancer_summary(db: Session, freelancer_id: int) -> Dict[str, Decimal]:
        # 1. Available balance (sum of all ledger entry amount where freelancer_profile_id = freelancer_id and status = AVAILABLE)
        available = db.query(func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.freelancer_profile_id == freelancer_id,
            LedgerEntry.status == "AVAILABLE"
        ).scalar() or Decimal("0.00")

        # 2. Pending balance (sum of all ledger entry amount where freelancer_profile_id = freelancer_id and status = PENDING)
        pending = db.query(func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.freelancer_profile_id == freelancer_id,
            LedgerEntry.status == "PENDING"
        ).scalar() or Decimal("0.00")

        # 3. Total Earned (net credit: sum of PAYMENT_CREDIT (+) and PLATFORM_COMMISSION (-))
        total_earned = db.query(func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.freelancer_profile_id == freelancer_id,
            LedgerEntry.entry_type.in_(["PAYMENT_CREDIT", "ADVANCE_CREDIT", "FINAL_CREDIT", "PLATFORM_COMMISSION", "ADJUSTMENT"]),
            LedgerEntry.status.in_(["PENDING", "AVAILABLE"])
        ).scalar() or Decimal("0.00")

        # 4. Paid Out (absolute sum of processed payouts)
        paid_out = db.query(func.sum(LedgerEntry.amount)).filter(
            LedgerEntry.freelancer_profile_id == freelancer_id,
            LedgerEntry.entry_type == "PAYOUT",
            LedgerEntry.status == "AVAILABLE"  # Payout debits are created as AVAILABLE directly when processed
        ).scalar() or Decimal("0.00")
        
        # payouts are recorded as negative values, convert to positive for summary presentation
        paid_out = abs(paid_out)

        return {
            "total_earned": Decimal(total_earned).quantize(Decimal("0.01")),
            "pending": Decimal(pending).quantize(Decimal("0.01")),
            "available": Decimal(available).quantize(Decimal("0.01")),
            "paid_out": Decimal(paid_out).quantize(Decimal("0.01")),
            "currency": "INR"
        }
