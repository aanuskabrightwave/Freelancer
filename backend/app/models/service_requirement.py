import enum
from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class RequirementFieldType(str, enum.Enum):
    TEXT = "TEXT"
    TEXTAREA = "TEXTAREA"
    NUMBER = "NUMBER"
    DATE = "DATE"
    SELECT = "SELECT"
    BOOLEAN = "BOOLEAN"
    FILE = "FILE"


class ServiceRequirement(Base):
    __tablename__ = "service_requirements"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(
        Integer,
        ForeignKey("services.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    question = Column(String(500), nullable=False)
    field_type = Column(Enum(RequirementFieldType), nullable=False)
    is_required = Column(Boolean, default=True, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    service = relationship("Service", back_populates="requirements")

    def __repr__(self) -> str:
        return f"<ServiceRequirement id={self.id} question='{self.question[:30]}...'>"
