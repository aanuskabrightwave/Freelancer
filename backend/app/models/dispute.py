import enum
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Enum, Boolean, func
from sqlalchemy.orm import relationship, backref
from app.core.database import Base


class DisputeReason(str, enum.Enum):
    WORK_NOT_DELIVERED = "WORK_NOT_DELIVERED"
    QUALITY_ISSUE = "QUALITY_ISSUE"
    MISSED_DEADLINE = "MISSED_DEADLINE"
    PAYMENT_ISSUE = "PAYMENT_ISSUE"
    UNAUTHORIZED_CANCELLATION = "UNAUTHORIZED_CANCELLATION"
    FREELANCER_NO_SHOW = "FREELANCER_NO_SHOW"
    CLIENT_NO_SHOW = "CLIENT_NO_SHOW"
    ABUSIVE_BEHAVIOR = "ABUSIVE_BEHAVIOR"
    COPYRIGHT_ISSUE = "COPYRIGHT_ISSUE"
    OTHER = "OTHER"


class DisputeStatus(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    WAITING_FOR_CLIENT = "WAITING_FOR_CLIENT"
    WAITING_FOR_FREELANCER = "WAITING_FOR_FREELANCER"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"
    REJECTED = "REJECTED"


class DisputePriority(str, enum.Enum):
    LOW = "LOW"
    NORMAL = "NORMAL"
    HIGH = "HIGH"
    URGENT = "URGENT"


class ResolutionType(str, enum.Enum):
    NO_ACTION = "NO_ACTION"
    FULL_REFUND = "FULL_REFUND"
    PARTIAL_REFUND = "PARTIAL_REFUND"
    RELEASE_TO_FREELANCER = "RELEASE_TO_FREELANCER"
    BOOKING_CANCELLED = "BOOKING_CANCELLED"
    WARNING_ISSUED = "WARNING_ISSUED"
    ACCOUNT_ACTION = "ACCOUNT_ACTION"
    OTHER = "OTHER"


class Dispute(Base):
    __tablename__ = "disputes"

    id = Column(Integer, primary_key=True, index=True)
    dispute_number = Column(String(50), unique=True, nullable=False, index=True)
    booking_id = Column(
        Integer,
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    opened_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    against_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    reason = Column(Enum(DisputeReason), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(DisputeStatus), default=DisputeStatus.OPEN, nullable=False, index=True)
    priority = Column(Enum(DisputePriority), default=DisputePriority.NORMAL, nullable=False, index=True)
    assigned_admin_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    resolution_type = Column(Enum(ResolutionType), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    opened_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    booking = relationship("Booking", backref=backref("disputes", cascade="all, delete-orphan"))
    opened_by = relationship("User", foreign_keys=[opened_by_user_id])
    against = relationship("User", foreign_keys=[against_user_id])
    assigned_admin = relationship("User", foreign_keys=[assigned_admin_id])
    
    messages = relationship("DisputeMessage", back_populates="dispute", cascade="all, delete-orphan")
    evidence = relationship("DisputeEvidence", back_populates="dispute", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Dispute id={self.id} dispute_number='{self.dispute_number}' status={self.status}>"


class DisputeMessage(Base):
    __tablename__ = "dispute_messages"

    id = Column(Integer, primary_key=True, index=True)
    dispute_id = Column(
        Integer,
        ForeignKey("disputes.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    sender_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    message = Column(Text, nullable=False)
    is_internal_admin_note = Column(Boolean, default=False, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    dispute = relationship("Dispute", back_populates="messages")
    sender = relationship("User")

    def __repr__(self) -> str:
        return f"<DisputeMessage id={self.id} dispute_id={self.dispute_id} is_note={self.is_internal_admin_note}>"


class DisputeEvidence(Base):
    __tablename__ = "dispute_evidence"

    id = Column(Integer, primary_key=True, index=True)
    dispute_id = Column(
        Integer,
        ForeignKey("disputes.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    uploaded_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    file_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    dispute = relationship("Dispute", back_populates="evidence")
    uploader = relationship("User")

    def __repr__(self) -> str:
        return f"<DisputeEvidence id={self.id} dispute_id={self.dispute_id} path='{self.file_path}'>"
