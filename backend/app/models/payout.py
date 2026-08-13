from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Numeric, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Payout(Base):
    __tablename__ = "payouts"

    id = Column(Integer, primary_key=True, index=True)
    payout_number = Column(String(50), unique=True, nullable=False, index=True)
    freelancer_profile_id = Column(
        Integer,
        ForeignKey("freelancer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    provider = Column(String(50), default="RAZORPAY", nullable=False)
    provider_transfer_id = Column(String(100), unique=True, nullable=True, index=True)
    
    amount = Column(Numeric(precision=10, scale=2), nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    status = Column(String(50), default="PENDING", nullable=False, index=True)  # PENDING, PROCESSING, PROCESSED, FAILED, REVERSED, CANCELLED
    failure_reason = Column(Text, nullable=True)
    
    initiated_at = Column(DateTime(timezone=True), nullable=True)
    processed_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    freelancer_profile = relationship("FreelancerProfile", backref="payouts")
