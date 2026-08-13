import enum
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Enum, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class RevisionStatus(str, enum.Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CANCELLED = "CANCELLED"


class RevisionRequest(Base):
    __tablename__ = "revision_requests"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(
        Integer,
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    delivery_id = Column(
        Integer,
        ForeignKey("deliveries.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    requested_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(Enum(RevisionStatus), default=RevisionStatus.OPEN, nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    booking = relationship("Booking", backref="revision_requests")
    delivery = relationship("Delivery", backref="revision_requests")
    requested_by = relationship("User")


class RevisionComment(Base):
    __tablename__ = "revision_comments"

    id = Column(Integer, primary_key=True, index=True)
    revision_request_id = Column(
        Integer,
        ForeignKey("revision_requests.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    timestamp_seconds = Column(Integer, nullable=True) # Video time in seconds e.g. 23 seconds
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    revision_request = relationship("RevisionRequest", backref="comments")
