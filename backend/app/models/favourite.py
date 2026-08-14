from sqlalchemy import Column, DateTime, ForeignKey, Integer, UniqueConstraint, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class FavouriteFreelancer(Base):
    __tablename__ = "favourite_freelancers"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    freelancer_profile_id = Column(Integer, ForeignKey("freelancer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("client_id", "freelancer_profile_id", name="uq_client_freelancer_favourite"),
    )

    # Relationships
    client = relationship("User", foreign_keys=[client_id], backref="favourite_freelancers")
    freelancer = relationship("FreelancerProfile", foreign_keys=[freelancer_profile_id], backref="favorited_by")

    def __repr__(self) -> str:
        return f"<FavouriteFreelancer client_id={self.client_id} freelancer_profile_id={self.freelancer_profile_id}>"


class FavouriteService(Base):
    __tablename__ = "favourite_services"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    service_id = Column(Integer, ForeignKey("services.id", ondelete="CASCADE"), nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("client_id", "service_id", name="uq_client_service_favourite"),
    )

    # Relationships
    client = relationship("User", foreign_keys=[client_id], backref="favourite_services")
    service = relationship("Service", foreign_keys=[service_id], backref="favorited_by")

    def __repr__(self) -> str:
        return f"<FavouriteService client_id={self.client_id} service_id={self.service_id}>"
