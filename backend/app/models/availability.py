import enum
from sqlalchemy import Column, DateTime, Date, Time, Enum, ForeignKey, Integer, String, Text, Boolean, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class AvailabilityType(str, enum.Enum):
    AVAILABLE = "AVAILABLE"
    UNAVAILABLE = "UNAVAILABLE"
    BLOCKED = "BLOCKED"


class FreelancerWeeklySchedule(Base):
    __tablename__ = "freelancer_weekly_schedules"

    id = Column(Integer, primary_key=True, index=True)
    freelancer_profile_id = Column(Integer, ForeignKey("freelancer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    day_of_week = Column(String(20), nullable=False)  # MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY, SUNDAY
    is_available = Column(Boolean, default=True, nullable=False)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)

    # Enforce one record per day per freelancer
    __table_args__ = (
        UniqueConstraint("freelancer_profile_id", "day_of_week", name="uq_freelancer_day"),
    )

    # Relationships
    freelancer = relationship("FreelancerProfile", foreign_keys=[freelancer_profile_id], backref="weekly_schedules")


class FreelancerAvailability(Base):
    __tablename__ = "freelancer_availabilities"

    id = Column(Integer, primary_key=True, index=True)
    freelancer_profile_id = Column(Integer, ForeignKey("freelancer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    availability_type = Column(Enum(AvailabilityType), default=AvailabilityType.UNAVAILABLE, nullable=False, index=True)
    note = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    freelancer = relationship("FreelancerProfile", foreign_keys=[freelancer_profile_id], backref="availability_overrides")
