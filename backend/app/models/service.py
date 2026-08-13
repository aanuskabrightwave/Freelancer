import enum
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class ServiceType(str, enum.Enum):
    ON_SITE = "ON_SITE"
    REMOTE = "REMOTE"
    HYBRID = "HYBRID"


class ServiceStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"
    PAUSED = "PAUSED"
    ARCHIVED = "ARCHIVED"


class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    freelancer_profile_id = Column(
        Integer,
        ForeignKey("freelancer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    title = Column(String(150), nullable=False)
    slug = Column(String(150), unique=True, index=True, nullable=False)
    short_description = Column(String(300), nullable=False)
    description = Column(Text, nullable=False)
    
    service_type = Column(Enum(ServiceType), nullable=False, index=True)
    
    category_id = Column(Integer, ForeignKey("service_categories.id", ondelete="SET NULL"), nullable=True, index=True)
    subcategory_id = Column(Integer, ForeignKey("service_categories.id", ondelete="SET NULL"), nullable=True, index=True)

    starting_price = Column(Numeric(precision=10, scale=2), default=0.0, nullable=True)
    delivery_time_days = Column(Integer, nullable=True)
    revisions = Column(Integer, nullable=True)
    
    is_active = Column(Boolean, default=True, nullable=False)
    is_featured = Column(Boolean, default=False, nullable=False)
    status = Column(Enum(ServiceStatus), default=ServiceStatus.DRAFT, nullable=False, index=True)

    # Location Specifics (On-site / Hybrid)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    service_radius_km = Column(Integer, nullable=True)
    travel_available = Column(Boolean, default=False, nullable=False)
    travel_fee = Column(Numeric(precision=10, scale=2), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    freelancer_profile = relationship("FreelancerProfile", back_populates="services")
    
    category = relationship(
        "ServiceCategory",
        foreign_keys=[category_id],
        back_populates="services"
    )
    subcategory = relationship(
        "ServiceCategory",
        foreign_keys=[subcategory_id],
        back_populates="subcategory_services"
    )

    packages = relationship("ServicePackage", back_populates="service", cascade="all, delete-orphan")
    media = relationship("ServiceMedia", back_populates="service", cascade="all, delete-orphan")
    requirements = relationship("ServiceRequirement", back_populates="service", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<Service id={self.id} title='{self.title}' status={self.status}>"


# Update FreelancerProfile with back_populates relationship
# (We will do this dynamically or modify freelancer_profile.py if needed,
# but using string targets in SQLAlchemy relationship permits resolving them seamlessly if imported)
from app.models.freelancer_profile import FreelancerProfile
FreelancerProfile.services = relationship("Service", back_populates="freelancer_profile", cascade="all, delete-orphan")
