import enum
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class EquipmentType(str, enum.Enum):
    CAMERA = "CAMERA"
    LENS = "LENS"
    DRONE = "DRONE"
    GIMBAL = "GIMBAL"
    LIGHTING = "LIGHTING"
    MICROPHONE = "MICROPHONE"
    TRIPOD = "TRIPOD"
    COMPUTER = "COMPUTER"
    OTHER = "OTHER"


class FreelancerEquipment(Base):
    __tablename__ = "freelancer_equipment"

    id = Column(Integer, primary_key=True, index=True)
    freelancer_profile_id = Column(
        Integer,
        ForeignKey("freelancer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    equipment_type = Column(Enum(EquipmentType), nullable=False)
    brand = Column(String(100), nullable=False)
    model = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    freelancer_profile = relationship("FreelancerProfile", back_populates="equipment")

    def __repr__(self) -> str:
        return f"<FreelancerEquipment id={self.id} brand='{self.brand}' model='{self.model}'>"
