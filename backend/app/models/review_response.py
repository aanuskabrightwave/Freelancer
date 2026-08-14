from sqlalchemy import Column, DateTime, ForeignKey, Integer, Text, func
from sqlalchemy.orm import relationship, backref
from app.core.database import Base


class ReviewResponse(Base):
    __tablename__ = "review_responses"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    freelancer_profile_id = Column(Integer, ForeignKey("freelancer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    response = Column(Text, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    review = relationship("Review", backref=backref("response_obj", uselist=False), uselist=False)
    freelancer = relationship("FreelancerProfile", backref="responses")

    def __repr__(self) -> str:
        return f"<ReviewResponse id={self.id} review_id={self.review_id}>"
