from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime
from decimal import Decimal


class PayoutResponse(BaseModel):
    id: int
    payout_number: str
    freelancer_profile_id: int
    provider: str
    provider_transfer_id: Optional[str] = None
    amount: Decimal
    currency: str
    status: str
    failure_reason: Optional[str] = None
    initiated_at: Optional[datetime] = None
    processed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PayoutAccountResponse(BaseModel):
    id: int
    freelancer_profile_id: int
    provider: str
    provider_account_id: str
    account_holder_name: Optional[str] = None
    account_type: str
    status: str
    is_default: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PayoutAccountCreatePayload(BaseModel):
    provider_account_id: str = Field(..., min_length=5, max_length=100)
    account_holder_name: Optional[str] = Field(None, min_length=2, max_length=100)
    account_type: str = Field("bank_account", description="bank_account or vpa")


class PayoutRequestPayload(BaseModel):
    amount: Optional[Decimal] = Field(None, description="payout amount requested. Defaults to total available if null.")
