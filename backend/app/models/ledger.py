from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Numeric, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class LedgerEntry(Base):
    __tablename__ = "ledger_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    freelancer_profile_id = Column(
        Integer,
        ForeignKey("freelancer_profiles.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    booking_id = Column(
        Integer,
        ForeignKey("bookings.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    payment_id = Column(
        Integer,
        ForeignKey("payments.id", ondelete="SET NULL"),
        nullable=True
    )
    payout_id = Column(
        Integer,
        ForeignKey("payouts.id", ondelete="SET NULL"),
        nullable=True
    )
    refund_id = Column(
        Integer,
        ForeignKey("refunds.id", ondelete="SET NULL"),
        nullable=True
    )

    entry_type = Column(String(50), nullable=False)  # PAYMENT_CREDIT, PLATFORM_COMMISSION, PAYOUT, REFUND, REFUND_REVERSAL, ADJUSTMENT
    amount = Column(Numeric(precision=10, scale=2), nullable=False)  # positive for credit, negative for debit
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, AVAILABLE, FAILED, CANCELLED
    description = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    user = relationship("User")
    freelancer_profile = relationship("FreelancerProfile", backref="ledger_entries")
    booking = relationship("Booking")
    payment = relationship("Payment")
    payout = relationship("Payout")
    refund = relationship("Refund")
