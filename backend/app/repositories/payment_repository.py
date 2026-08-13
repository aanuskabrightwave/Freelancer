from typing import List, Optional
from sqlalchemy.orm import Session
from app.models.payment import Payment, PaymentAttempt, PaymentWebhookEvent


class PaymentRepository:
    @staticmethod
    def get_by_id(db: Session, id: int) -> Optional[Payment]:
        return db.query(Payment).filter(Payment.id == id).first()

    @staticmethod
    def get_by_booking_id(db: Session, booking_id: int) -> Optional[Payment]:
        return db.query(Payment).filter(Payment.booking_id == booking_id).first()

    @staticmethod
    def get_by_provider_order_id(db: Session, order_id: str) -> Optional[Payment]:
        return db.query(Payment).filter(Payment.provider_order_id == order_id).first()

    @staticmethod
    def get_by_number(db: Session, payment_number: str) -> Optional[Payment]:
        return db.query(Payment).filter(Payment.payment_number == payment_number).first()

    @staticmethod
    def create(db: Session, payment_data: dict) -> Payment:
        db_payment = Payment(**payment_data)
        db.add(db_payment)
        db.commit()
        db.refresh(db_payment)
        return db_payment

    @staticmethod
    def get_client_payments(db: Session, client_id: int) -> List[Payment]:
        return db.query(Payment).filter(Payment.client_id == client_id).order_by(Payment.created_at.desc()).all()

    @staticmethod
    def get_total_payments_count(db: Session) -> int:
        from sqlalchemy import func
        return db.query(func.count(Payment.id)).scalar() or 0

    # Attempts
    @staticmethod
    def create_attempt(db: Session, attempt_data: dict) -> PaymentAttempt:
        db_attempt = PaymentAttempt(**attempt_data)
        db.add(db_attempt)
        db.commit()
        db.refresh(db_attempt)
        return db_attempt

    # Webhooks
    @staticmethod
    def create_webhook_event(db: Session, webhook_data: dict) -> PaymentWebhookEvent:
        db_evt = PaymentWebhookEvent(**webhook_data)
        db.add(db_evt)
        db.commit()
        db.refresh(db_evt)
        return db_evt

    @staticmethod
    def get_webhook_event(db: Session, provider_event_id: str) -> Optional[PaymentWebhookEvent]:
        return db.query(PaymentWebhookEvent).filter(PaymentWebhookEvent.provider_event_id == provider_event_id).first()
