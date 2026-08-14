import enum
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, Float, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class FreelancerProfession(str, enum.Enum):
    PHOTOGRAPHER = "PHOTOGRAPHER"
    VIDEOGRAPHER = "VIDEOGRAPHER"
    VIDEO_EDITOR = "VIDEO_EDITOR"
    PHOTO_EDITOR = "PHOTO_EDITOR"
    CINEMATOGRAPHER = "CINEMATOGRAPHER"
    DRONE_OPERATOR = "DRONE_OPERATOR"
    REEL_EDITOR = "REEL_EDITOR"
    MOTION_GRAPHICS_ARTIST = "MOTION_GRAPHICS_ARTIST"
    COLOR_GRADER = "COLOR_GRADER"
    OTHER = "OTHER"


class VerificationStatus(str, enum.Enum):
    NOT_SUBMITTED = "NOT_SUBMITTED"
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"
    RESUBMISSION_REQUIRED = "RESUBMISSION_REQUIRED"


class FreelancerProfile(Base):
    __tablename__ = "freelancer_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    professional_title = Column(String(120), nullable=False)
    primary_profession = Column(Enum(FreelancerProfession), nullable=False, index=True)
    bio = Column(Text, nullable=False)
    experience_years = Column(Integer, nullable=False)

    city = Column(String(100), nullable=False, index=True)
    state = Column(String(100), nullable=False)
    country = Column(String(100), nullable=False)

    service_radius_km = Column(Integer, nullable=True)
    willing_to_travel = Column(Boolean, default=False, nullable=False)

    # Use Numeric with precision and scale for currency/financials
    starting_price = Column(Numeric(precision=10, scale=2), nullable=True)
    hourly_rate = Column(Numeric(precision=10, scale=2), nullable=True)
    event_rate = Column(Numeric(precision=10, scale=2), nullable=True)

    profile_photo_url = Column(String(500), nullable=True)
    cover_photo_url = Column(String(500), nullable=True)

    profile_completion_percentage = Column(Integer, default=0, nullable=False)
    verification_status = Column(Enum(VerificationStatus), default=VerificationStatus.NOT_SUBMITTED, nullable=False)
    is_profile_public = Column(Boolean, default=False, nullable=False)

    average_rating = Column(Float, nullable=True)
    review_count = Column(Integer, default=0, nullable=False)
    completed_jobs_count = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    user = relationship("User", backref="freelancer_profile", uselist=False)
    
    # many-to-many relationship with Skill
    skills = relationship("Skill", secondary="freelancer_skills", back_populates="freelancer_profiles")
    
    # one-to-many relationship with FreelancerEquipment
    equipment = relationship("FreelancerEquipment", back_populates="freelancer_profile", cascade="all, delete-orphan")
    
    # one-to-many relationship with PortfolioItem
    portfolio = relationship("PortfolioItem", back_populates="freelancer_profile", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<FreelancerProfile id={self.id} user_id={self.user_id} title='{self.professional_title}'>"
