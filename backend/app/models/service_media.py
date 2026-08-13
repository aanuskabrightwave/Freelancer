from sqlalchemy import Boolean, Column, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.portfolio import MediaType


class ServiceMedia(Base):
    __tablename__ = "service_media"

    id = Column(Integer, primary_key=True, index=True)
    service_id = Column(
        Integer,
        ForeignKey("services.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    media_type = Column(Enum(MediaType), nullable=False)
    media_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)
    is_cover = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    service = relationship("Service", back_populates="media")

    def __repr__(self) -> str:
        return f"<ServiceMedia id={self.id} type={self.media_type} is_cover={self.is_cover}>"
