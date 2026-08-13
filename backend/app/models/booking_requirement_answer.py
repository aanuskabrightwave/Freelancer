from sqlalchemy import Column, DateTime, Date, ForeignKey, Integer, Numeric, String, Text, Boolean, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class BookingRequirementAnswer(Base):
    __tablename__ = "booking_requirement_answers"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=False, index=True)
    service_requirement_id = Column(Integer, ForeignKey("service_requirements.id", ondelete="CASCADE"), nullable=False, index=True)
    
    answer_text = Column(Text, nullable=True)
    answer_number = Column(Numeric(precision=10, scale=2), nullable=True)
    answer_date = Column(Date, nullable=True)
    answer_boolean = Column(Boolean, nullable=True)
    file_url = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    booking = relationship("Booking", back_populates="requirement_answers")
    service_requirement = relationship("ServiceRequirement")
