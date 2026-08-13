import enum
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class PackageType(str, enum.Enum):
    BASIC = "BASIC"
    STANDARD = "STANDARD"
    PREMIUM = "PREMIUM"


class ServicePackage(Base):
    __tablename__ = "service_packages"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(
        Integer,
        ForeignKey("services.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    package_type = Column(Enum(PackageType), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text, nullable=False)
    
    price = Column(Numeric(precision=10, scale=2), nullable=False)
    delivery_time_days = Column(Integer, nullable=False)
    revisions = Column(Integer, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    service = relationship("Service", back_populates="packages")
    deliverables = relationship("PackageDeliverable", back_populates="package", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<ServicePackage id={self.id} type={self.package_type} price={self.price}>"


class PackageDeliverable(Base):
    __tablename__ = "package_deliverables"

    id = Column(Integer, primary_key=True, index=True)
    service_package_id = Column(
        Integer,
        ForeignKey("service_packages.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    label = Column(String(100), nullable=False)
    value = Column(String(100), nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    # Relationships
    package = relationship("ServicePackage", back_populates="deliverables")

    def __repr__(self) -> str:
        return f"<PackageDeliverable id={self.id} label='{self.label}' value='{self.value}'>"
