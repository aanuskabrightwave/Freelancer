from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
from datetime import datetime
from decimal import Decimal


class PaymentOrderResponse(BaseModel):
    payment_number: str
    provider: str
    provider_order_id: str
    amount: int  # in paise
    currency: str
    razorpay_key_id: str


class PaymentEligibilityResponse(BaseModel):
    booking_id: int
    total_amount: float
    amount_paid: float
    remaining_amount: float
    payment_stage: str
    can_pay: bool
    blocking_reason: Optional[str] = None


class PaymentVerifyPayload(BaseModel):
    razorpay_order_id: str
    razorpay_payment_id: str
    razorpay_signature: str


class PaymentSummaryResponse(BaseModel):
    booking_number: str
    amount: Decimal
    currency: str
    payment_status: str


class PaymentResponse(BaseModel):
    id: int
    payment_number: str
    booking_id: int
    client_id: int
    freelancer_profile_id: int
    provider: str
    provider_order_id: str
    provider_payment_id: Optional[str] = None
    currency: str
    gross_amount: Decimal
    platform_fee_amount: Decimal
    freelancer_amount: Decimal
    gateway_fee_amount: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    commission_percent_snapshot: Decimal
    status: str
    payment_type: Optional[str] = None
    payment_method: Optional[str] = None
    failure_code: Optional[str] = None
    failure_description: Optional[str] = None
    paid_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
