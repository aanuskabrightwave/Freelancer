import enum
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text, Boolean, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class ReviewStatus(str, enum.Enum):
    PUBLISHED = "PUBLISHED"
    HIDDEN = "HIDDEN"
    REPORTED = "REPORTED"
    REMOVED = "REMOVED"


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    client_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    freelancer_profile_id = Column(Integer, ForeignKey("freelancer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)

    overall_rating = Column(Integer, nullable=False, index=True)
    quality_rating = Column(Integer, nullable=True)
    communication_rating = Column(Integer, nullable=True)
    professionalism_rating = Column(Integer, nullable=True)
    timeliness_rating = Column(Integer, nullable=True)
    value_rating = Column(Integer, nullable=True)

    title = Column(String(150), nullable=True)
    comment = Column(Text, nullable=False)
    status = Column(Enum(ReviewStatus), default=ReviewStatus.PUBLISHED, nullable=False, index=True)
    is_verified_booking = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    booking = relationship("Booking", backref="review", uselist=False)
    client = relationship("User", foreign_keys=[client_id], backref="submitted_reviews")
    freelancer = relationship("FreelancerProfile", foreign_keys=[freelancer_profile_id], backref="reviews")
    service = relationship("Service", foreign_keys=[service_id], backref="reviews")
    project = relationship("Project", foreign_keys=[project_id], backref="reviews")

    def __repr__(self) -> str:
        return f"<Review id={self.id} booking_id={self.booking_id} overall_rating={self.overall_rating} status={self.status}>"
