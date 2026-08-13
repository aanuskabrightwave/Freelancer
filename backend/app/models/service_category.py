from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class ServiceCategory(Base):
    __tablename__ = "service_categories"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    slug = Column(String(100), unique=True, index=True, nullable=False)
    description = Column(Text, nullable=True)
    
    parent_id = Column(Integer, ForeignKey("service_categories.id", ondelete="CASCADE"), nullable=True, index=True)
    is_active = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    parent = relationship("ServiceCategory", remote_side=[id], backref="subcategories")
    services = relationship("Service", back_populates="category", foreign_keys="[Service.category_id]")
    subcategory_services = relationship("Service", back_populates="subcategory", foreign_keys="[Service.subcategory_id]")

    def __repr__(self) -> str:
        return f"<ServiceCategory id={self.id} name='{self.name}' parent_id={self.parent_id}>"
