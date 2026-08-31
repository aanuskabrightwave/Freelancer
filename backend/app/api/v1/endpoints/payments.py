from fastapi import APIRouter, Depends, status, Request
from sqlalchemy.orm import Session
from typing import List

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user, require_role
from app.models.user import User
from app.services.payment_service import PaymentService
from app.services.refund_service import RefundService
from app.repositories.payment_repository import PaymentRepository
from app.repositories.booking_repository import BookingRepository
from app.schemas.payment import (
    PaymentOrderResponse,
    PaymentEligibilityResponse,
    PaymentVerifyPayload,
    PaymentSummaryResponse,
    PaymentResponse
)
from app.schemas.refund import (
    RefundResponse,
    RefundRequestCreatePayload,
    AdminRefundExecutePayload
)

router = APIRouter()


@router.get("/client/bookings/{booking_id}/payment/eligibility", response_model=PaymentEligibilityResponse, summary="Get payment eligibility for checkout")
def get_payment_eligibility(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return PaymentService.get_payment_eligibility(db, current_user, booking_id)


@router.post("/client/bookings/{booking_id}/payment/order", response_model=PaymentOrderResponse, status_code=status.HTTP_201_CREATED, summary="Create payment gateway order")
def create_payment_order(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return PaymentService.create_payment_order(db, current_user, booking_id)


@router.post("/client/bookings/{booking_id}/payment/verify", response_model=PaymentResponse, summary="Verify payment signature after client completes checkout")
def verify_payment(
    booking_id: int,
    payload: PaymentVerifyPayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return PaymentService.verify_payment_signature(db, current_user, booking_id, payload.model_dump())


@router.get("/client/bookings/{booking_id}/payment-summary", response_model=PaymentSummaryResponse, summary="Get payment summary status")
def get_payment_summary(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    booking = BookingRepository.get_by_id(db, booking_id)
    if not booking:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Booking match not found.")

    from app.services.workspace_service import WorkspaceService
    WorkspaceService.validate_membership(db, current_user, booking)

    payment = PaymentRepository.get_by_booking_id(db, booking_id)
    status_str = "UNPAID"
    if payment:
        status_str = payment.status

    return {
        "booking_number": booking.booking_number,
        "amount": booking.agreed_amount,
        "currency": booking.currency,
        "payment_status": status_str
    }


@router.get("/client/payments", response_model=List[PaymentResponse], summary="List client payment history")
def get_client_payments(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return PaymentRepository.get_client_payments(db, current_user.id)


@router.get("/client/payments/{id}", response_model=PaymentResponse, summary="Get payment receipt details")
def get_payment_details(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    payment = PaymentRepository.get_by_id(db, id)
    if not payment:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Payment record not found.")

    if payment.client_id != current_user.id and current_user.role != "ADMIN":
        from fastapi import HTTPException
        raise HTTPException(status_code=403, detail="Unauthorized receipt request.")

    return payment


@router.post("/payments/{payment_id}/refund", response_model=RefundResponse, status_code=status.HTTP_201_CREATED, summary="Execute admin payment refund")
def execute_refund(
    payment_id: int,
    payload: AdminRefundExecutePayload,
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    return RefundService.execute_admin_refund(db, current_user, payment_id, payload.amount, payload.reason)


@router.post("/client/bookings/{booking_id}/refund-request", response_model=RefundResponse, status_code=status.HTTP_201_CREATED, summary="Submit client refund request review")
def request_refund(
    booking_id: int,
    payload: RefundRequestCreatePayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return RefundService.request_client_refund(db, current_user, booking_id, payload.reason)


@router.post("/webhooks/razorpay", summary="Process Razorpay webhook")
async def razorpay_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.body()
    signature = request.headers.get("X-Razorpay-Signature", "")
    PaymentService.handle_webhook(db, body, signature)
    return {"status": "success"}
