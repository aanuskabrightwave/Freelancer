import enum
from sqlalchemy import Column, DateTime, Date, Time, Enum, ForeignKey, Integer, Numeric, String, Text, JSON, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class BookingStatus(str, enum.Enum):
    REQUESTED = "REQUESTED"
    PENDING_CONFIRMATION = "PENDING_CONFIRMATION"
    CONFIRMED = "CONFIRMED"
    IN_PROGRESS = "IN_PROGRESS"
    DELIVERY_PENDING = "DELIVERY_PENDING"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"
    CANCELLED = "CANCELLED"
    RESCHEDULE_REQUESTED = "RESCHEDULE_REQUESTED"


class BookingSourceType(str, enum.Enum):
    SERVICE = "SERVICE"
    PROJECT = "PROJECT"


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_number = Column(String(50), unique=True, index=True, nullable=False)
    client_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    freelancer_profile_id = Column(Integer, ForeignKey("freelancer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    source_type = Column(Enum(BookingSourceType), default=BookingSourceType.SERVICE, nullable=False, index=True)

    # DIRECT flow specifics (optional if project flow)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=True, index=True)
    service_package_id = Column(Integer, ForeignKey("service_packages.id", ondelete="CASCADE"), nullable=True, index=True)

    # PROJECT flow specifics (optional if direct flow)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=True, index=True)
    proposal_id = Column(Integer, ForeignKey("proposals.id", ondelete="CASCADE"), nullable=True, index=True)

    # Booking general info
    title = Column(String(255), nullable=True)
    description = Column(Text, nullable=True)
    booking_type = Column(String(50), default="REMOTE", nullable=False)  # ON_SITE, REMOTE, HYBRID
    status = Column(Enum(BookingStatus), default=BookingStatus.REQUESTED, nullable=False, index=True)

    scheduled_date = Column(Date, nullable=True, index=True)
    booking_date = Column(DateTime(timezone=True), nullable=True) # Kept for legacy backward compatibility
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    timezone = Column(String(50), default="Asia/Kolkata", nullable=False)
    expected_duration_hours = Column(Integer, nullable=True)
    delivery_deadline = Column(DateTime(timezone=True), nullable=True)

    # Location specifics
    location_city = Column(String(100), nullable=True)
    location_state = Column(String(100), nullable=True)
    location_country = Column(String(100), nullable=True)
    venue_name = Column(String(255), nullable=True)
    venue_address = Column(Text, nullable=True)

    # Financials
    agreed_amount = Column(Numeric(precision=10, scale=2), nullable=False)
    currency = Column(String(10), default="INR", nullable=False)
    price = Column(Numeric(precision=10, scale=2), nullable=False)  # Kept for backward compatibility with Phase 5 endpoints

    # Two-stage payment financials
    deposit_amount = Column(Numeric(precision=10, scale=2), default=0.00, nullable=False)
    deposit_paid_amount = Column(Numeric(precision=10, scale=2), default=0.00, nullable=False)
    remaining_balance = Column(Numeric(precision=10, scale=2), default=0.00, nullable=False)
    total_paid = Column(Numeric(precision=10, scale=2), default=0.00, nullable=False)
    payment_completion_state = Column(String(50), default="UNPAID", nullable=False)

    # Dispute window timelines
    final_approved_at = Column(DateTime(timezone=True), nullable=True)
    dispute_window_ends_at = Column(DateTime(timezone=True), nullable=True)

    # Notes and requirements answers
    notes = Column(Text, nullable=True)
    requirements_answers = Column(JSON, nullable=True)  # Legacy json answers

    # Cancellation audit
    cancellation_reason = Column(Text, nullable=True)
    cancelled_by = Column(String(50), nullable=True)  # CLIENT, FREELANCER, ADMIN

    # Timeline audit
    confirmed_at = Column(DateTime(timezone=True), nullable=True)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    cancelled_at = Column(DateTime(timezone=True), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    client = relationship("User", foreign_keys=[client_id], backref="client_bookings")
    freelancer = relationship("FreelancerProfile", foreign_keys=[freelancer_profile_id], backref="freelancer_bookings")
    service = relationship("Service", foreign_keys=[service_id])
    package = relationship("ServicePackage", foreign_keys=[service_package_id])
    project = relationship("Project", foreign_keys=[project_id])
    proposal = relationship("Proposal", foreign_keys=[proposal_id])
    workspace = relationship("BookingWorkspace", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    requirement_answers = relationship("BookingRequirementAnswer", back_populates="booking", cascade="all, delete-orphan")
    reschedule_requests = relationship("BookingRescheduleRequest", back_populates="booking", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Booking id={self.id} booking_number={self.booking_number} status={self.status}>"
