import enum
from sqlalchemy import Column, DateTime, Date, Time, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class RescheduleRequestStatus(str, enum.Enum):
    PENDING = "PENDING"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"


class BookingRescheduleRequest(Base):
    __tablename__ = "booking_reschedule_requests"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    requested_by = Column(String(50), nullable=False)  # CLIENT, FREELANCER

    old_date = Column(Date, nullable=True)
    old_start_time = Column(Time, nullable=True)
    old_end_time = Column(Time, nullable=True)

    new_date = Column(Date, nullable=False)
    new_start_time = Column(Time, nullable=True)
    new_end_time = Column(Time, nullable=True)

    reason = Column(Text, nullable=True)
    status = Column(Enum(RescheduleRequestStatus), default=RescheduleRequestStatus.PENDING, nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    responded_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    booking = relationship("Booking", back_populates="reschedule_requests")
