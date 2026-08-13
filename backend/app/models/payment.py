from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Numeric, Text, Boolean, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    payment_number = Column(String(50), unique=True, nullable=False, index=True)
    booking_id = Column(
        Integer,
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    client_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    freelancer_profile_id = Column(
        Integer,
        ForeignKey("freelancer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    provider = Column(String(50), default="RAZORPAY", nullable=False)
    provider_order_id = Column(String(100), unique=True, nullable=False, index=True)
    provider_payment_id = Column(String(100), unique=True, nullable=True, index=True)
    
    currency = Column(String(10), default="INR", nullable=False)
    
    gross_amount = Column(Numeric(precision=10, scale=2), nullable=False)
    platform_fee_amount = Column(Numeric(precision=10, scale=2), nullable=False)
    freelancer_amount = Column(Numeric(precision=10, scale=2), nullable=False)
    gateway_fee_amount = Column(Numeric(precision=10, scale=2), nullable=True)
    tax_amount = Column(Numeric(precision=10, scale=2), nullable=True)
    
    # commission Snapshot today
    commission_percent_snapshot = Column(Numeric(precision=5, scale=2), nullable=False)
    
    status = Column(String(50), default="CREATED", nullable=False, index=True)
    payment_method = Column(String(50), nullable=True)
    failure_code = Column(String(100), nullable=True)
    failure_description = Column(Text, nullable=True)
    
    paid_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    booking = relationship("Booking", backref="payments")
    client = relationship("User", foreign_keys=[client_id])
    freelancer_profile = relationship("FreelancerProfile", foreign_keys=[freelancer_profile_id])
    attempts = relationship("PaymentAttempt", back_populates="payment", cascade="all, delete-orphan")


class PaymentAttempt(Base):
    __tablename__ = "payment_attempts"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(
        Integer,
        ForeignKey("payments.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    provider_order_id = Column(String(100), nullable=False)
    provider_payment_id = Column(String(100), nullable=True)
    status = Column(String(50), nullable=False)
    failure_code = Column(String(100), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    payment = relationship("Payment", back_populates="attempts")


class PaymentWebhookEvent(Base):
    __tablename__ = "payment_webhook_events"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String(50), nullable=False)
    provider_event_id = Column(String(100), unique=True, nullable=False, index=True)
    event_type = Column(String(100), nullable=False)
    payload_hash = Column(String(100), nullable=False)
    processed = Column(Boolean, default=False, nullable=False)
    processing_error = Column(Text, nullable=True)
    received_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)
