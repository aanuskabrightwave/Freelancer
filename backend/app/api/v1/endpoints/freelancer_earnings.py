from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User, UserRole
from app.services.payout_service import PayoutService
from app.schemas.earnings import EarningSummaryResponse, LedgerEntryResponse
from app.schemas.payout import PayoutAccountResponse, PayoutAccountCreatePayload

router = APIRouter()


@router.get("/freelancer/earnings", response_model=EarningSummaryResponse, summary="Get freelancer earnings metrics summary")
def get_earnings_summary(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only freelancers can retrieve earnings summaries.")
    return PayoutService.get_earnings_summary(db, current_user)


@router.get("/freelancer/earnings/transactions", response_model=List[LedgerEntryResponse], summary="List freelancer ledger transaction entries")
def get_earnings_transactions(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only freelancers can access transaction ledger history.")
    return PayoutService.get_earnings_transactions(db, current_user)


@router.post("/freelancer/earnings/payout-account", response_model=PayoutAccountResponse, status_code=status.HTTP_201_CREATED, summary="Configure connected payout account details")
def configure_payout_account(
    payload: PayoutAccountCreatePayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only freelancers can configure payout details.")
    return PayoutService.link_payout_account(
        db,
        current_user,
        payload.provider_account_id,
        payload.account_holder_name,
        payload.account_type
    )
