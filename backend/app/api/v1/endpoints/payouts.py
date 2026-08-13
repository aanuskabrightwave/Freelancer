from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User, UserRole
from app.services.payout_service import PayoutService
from app.schemas.payout import PayoutResponse, PayoutRequestPayload

router = APIRouter()


@router.get("/freelancer/payouts", response_model=List[PayoutResponse], summary="List freelancer payouts history logs")
def get_payouts(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only freelancers can retrieve payout history.")
    return PayoutService.get_payouts(db, current_user)


@router.post("/freelancer/payouts/request", response_model=PayoutResponse, status_code=status.HTTP_201_CREATED, summary="Trigger manual payout of available balance")
def request_payout(
    payload: PayoutRequestPayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER:
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Only freelancers can trigger payout requests.")
    return PayoutService.initiate_payout(db, current_user, payload.amount)
