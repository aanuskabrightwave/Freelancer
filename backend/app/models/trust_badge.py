from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Boolean, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class TrustBadge(Base):
    __tablename__ = "trust_badges"

    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    icon = Column(String(100), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    def __repr__(self) -> str:
        return f"<TrustBadge code={self.code} name={self.name}>"


class FreelancerBadge(Base):
    __tablename__ = "freelancer_badges"

    id = Column(Integer, primary_key=True, index=True)
    freelancer_profile_id = Column(Integer, ForeignKey("freelancer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    badge_id = Column(Integer, ForeignKey("trust_badges.id", ondelete="CASCADE"), nullable=False, index=True)
    source = Column(String(50), default="SYSTEM", nullable=False)  # SYSTEM, ADMIN
    awarded_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=True)
    is_active = Column(Boolean, default=True, nullable=False)

    __table_args__ = (
        UniqueConstraint("freelancer_profile_id", "badge_id", name="uq_freelancer_badge"),
    )

    # Relationships
    freelancer = relationship("FreelancerProfile", backref="badges")
    badge = relationship("TrustBadge", backref="freelancer_awards")

    def __repr__(self) -> str:
        return f"<FreelancerBadge freelancer_profile_id={self.freelancer_profile_id} badge_id={self.badge_id}>"
