from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Numeric, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Refund(Base):
    __tablename__ = "refunds"

    id = Column(Integer, primary_key=True, index=True)
    refund_number = Column(String(50), unique=True, nullable=False, index=True)
    payment_id = Column(
        Integer,
        ForeignKey("payments.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    booking_id = Column(
        Integer,
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    provider = Column(String(50), default="RAZORPAY", nullable=False)
    provider_refund_id = Column(String(100), unique=True, nullable=True, index=True)
    
    amount = Column(Numeric(precision=10, scale=2), nullable=False)
    reason = Column(Text, nullable=True)
    requested_by = Column(String(50), default="CLIENT", nullable=False)  # CLIENT, ADMIN, SYSTEM
    status = Column(String(50), default="REQUESTED", nullable=False, index=True)  # REQUESTED, PROCESSING, PROCESSED, FAILED, CANCELLED

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    payment = relationship("Payment", backref="refunds")
    booking = relationship("Booking", backref="refunds")
