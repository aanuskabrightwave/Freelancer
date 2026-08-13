from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.payout_account import FreelancerPayoutAccount
from app.models.payout import Payout


class PayoutRepository:
    @staticmethod
    def get_account_by_freelancer_id(db: Session, freelancer_id: int) -> Optional[FreelancerPayoutAccount]:
        return db.query(FreelancerPayoutAccount).filter(FreelancerPayoutAccount.freelancer_profile_id == freelancer_id).first()

    @staticmethod
    def create_payout_account(db: Session, account_data: dict) -> FreelancerPayoutAccount:
        db_account = FreelancerPayoutAccount(**account_data)
        db.add(db_account)
        db.commit()
        db.refresh(db_account)
        return db_account

    @staticmethod
    def create_payout(db: Session, payout_data: dict) -> Payout:
        db_payout = Payout(**payout_data)
        db.add(db_payout)
        db.commit()
        db.refresh(db_payout)
        return db_payout

    @staticmethod
    def get_payouts_by_freelancer_id(db: Session, freelancer_id: int) -> List[Payout]:
        return db.query(Payout).filter(Payout.freelancer_profile_id == freelancer_id).order_by(Payout.created_at.desc()).all()

    @staticmethod
    def get_total_payouts_count(db: Session) -> int:
        from sqlalchemy import func
        return db.query(func.count(Payout.id)).scalar() or 0
