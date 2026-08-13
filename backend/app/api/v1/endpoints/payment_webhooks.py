from fastapi import APIRouter, Depends, status, Request, Header
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.services.payment_service import PaymentService

router = APIRouter()


@router.post("/webhooks/razorpay", status_code=status.HTTP_200_OK, summary="Ingest Razorpay transactional webhook event payload")
async def handle_razorpay_webhook(
    request: Request,
    x_razorpay_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    # Verify raw webhook payload
    raw_body = await request.body()
    PaymentService.handle_webhook(db, raw_body, x_razorpay_signature or "")
    return {"status": "success", "message": "Webhook processed successfully"}
