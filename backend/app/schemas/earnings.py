from pydantic import BaseModel, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal


class EarningSummaryResponse(BaseModel):
    total_earned: Decimal
    pending: Decimal
    available: Decimal
    paid_out: Decimal
    currency: str


class LedgerEntryResponse(BaseModel):
    id: int
    user_id: Optional[int] = None
    freelancer_profile_id: Optional[int] = None
    booking_id: Optional[int] = None
    payment_id: Optional[int] = None
    payout_id: Optional[int] = None
    refund_id: Optional[int] = None
    entry_type: str
    amount: Decimal
    currency: str
    status: str
    description: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
