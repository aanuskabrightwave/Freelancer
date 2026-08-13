from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Boolean, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class FreelancerPayoutAccount(Base):
    __tablename__ = "freelancer_payout_accounts"

    id = Column(Integer, primary_key=True, index=True)
    freelancer_profile_id = Column(
        Integer,
        ForeignKey("freelancer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True
    )
    provider = Column(String(50), default="RAZORPAY", nullable=False)
    provider_account_id = Column(String(100), nullable=False, index=True)
    account_holder_name = Column(String(100), nullable=True)
    account_type = Column(String(50), default="bank_account", nullable=False)  # bank_account, vpa
    
    status = Column(String(50), default="NOT_CONFIGURED", nullable=False)  # NOT_CONFIGURED, PENDING_VERIFICATION, VERIFIED, REJECTED, DISABLED
    is_default = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    freelancer_profile = relationship("FreelancerProfile", backref="payout_account")
