import enum
from sqlalchemy import Boolean, Column, Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class MediaType(str, enum.Enum):
    IMAGE = "IMAGE"
    VIDEO = "VIDEO"
    EXTERNAL_VIDEO = "EXTERNAL_VIDEO"


class PortfolioItem(Base):
    __tablename__ = "portfolio_items"

    id = Column(Integer, primary_key=True, index=True)
    freelancer_profile_id = Column(
        Integer,
        ForeignKey("freelancer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    title = Column(String(150), nullable=False)
    description = Column(Text, nullable=True)
    
    media_type = Column(Enum(MediaType), nullable=False)
    media_url = Column(String(500), nullable=False)
    thumbnail_url = Column(String(500), nullable=True)
    
    category = Column(String(100), nullable=False)
    project_date = Column(Date, nullable=True)
    
    is_featured = Column(Boolean, default=False, nullable=False)
    sort_order = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    freelancer_profile = relationship("FreelancerProfile", back_populates="portfolio")

    def __repr__(self) -> str:
        return f"<PortfolioItem id={self.id} title='{self.title}' type={self.media_type}>"
