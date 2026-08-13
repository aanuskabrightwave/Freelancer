from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal


class RefundResponse(BaseModel):
    id: int
    refund_number: str
    payment_id: int
    booking_id: int
    provider: str
    provider_refund_id: Optional[str] = None
    amount: Decimal
    reason: Optional[str] = None
    requested_by: str
    status: str
    created_at: datetime
    processed_at: Optional[datetime] = None
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RefundRequestCreatePayload(BaseModel):
    reason: str = Field(..., min_length=5, max_length=1000)


class AdminRefundExecutePayload(BaseModel):
    amount: Decimal = Field(..., gt=0)
    reason: str = Field(..., min_length=5, max_length=1000)
