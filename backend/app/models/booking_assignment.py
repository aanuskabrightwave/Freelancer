import enum
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class AssignmentStatus(str, enum.Enum):
    OFFERED = "OFFERED"
    ACCEPTED = "ACCEPTED"
    DECLINED = "DECLINED"
    EXPIRED = "EXPIRED"
    CANCELLED = "CANCELLED"


class ClientApprovalStatus(str, enum.Enum):
    NOT_REQUIRED = "NOT_REQUIRED"
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class BookingAssignment(Base):
    __tablename__ = "booking_assignments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(
        Integer,
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    freelancer_profile_id = Column(
        Integer,
        ForeignKey("freelancer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    assigned_by_admin_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    assignment_round = Column(Integer, default=1, nullable=False)

    # Status & Financial Offer
    status = Column(String(50), default=AssignmentStatus.OFFERED.value, nullable=False, index=True)
    offered_payout_amount = Column(Numeric(precision=10, scale=2), nullable=False)

    # Freelancer Response
    decline_reason = Column(Text, nullable=True)
    counter_offer_amount = Column(Numeric(precision=10, scale=2), nullable=True)
    counter_offer_notes = Column(Text, nullable=True)

    # Client Replacement Approval
    is_replacement = Column(Boolean, default=False, nullable=False)
    client_approval_required = Column(Boolean, default=False, nullable=False)
    client_approval_status = Column(String(50), default=ClientApprovalStatus.NOT_REQUIRED.value, nullable=False)
    client_approval_notes = Column(Text, nullable=True)
    client_responded_at = Column(DateTime(timezone=True), nullable=True)

    # Expiration & Timestamps
    expires_at = Column(DateTime(timezone=True), nullable=True)
    offered_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    responded_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    booking = relationship("Booking", back_populates="assignments")
    freelancer_profile = relationship("FreelancerProfile", foreign_keys=[freelancer_profile_id], backref="booking_assignments")
    assigned_by_admin = relationship("User", foreign_keys=[assigned_by_admin_id], backref="admin_assignments")

    def __repr__(self) -> str:
        return f"<BookingAssignment id={self.id} booking_id={self.booking_id} freelancer_profile_id={self.freelancer_profile_id} status={self.status}>"
