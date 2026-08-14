from sqlalchemy import Column, DateTime, ForeignKey, Integer, Numeric, String, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    project_type = Column(String(50), default="REMOTE", nullable=False)  # ON_SITE, REMOTE, HYBRID
    budget = Column(Numeric(precision=10, scale=2), nullable=False)
    city = Column(String(100), nullable=True)
    state = Column(String(100), nullable=True)
    country = Column(String(100), nullable=True)
    status = Column(String(50), default="OPEN", nullable=False, index=True)  # OPEN, AWARDED, COMPLETED, CANCELLED

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    client = relationship("User", foreign_keys=[client_id], backref="client_projects")
    proposals = relationship("Proposal", back_populates="project", cascade="all, delete-orphan")


class Proposal(Base):
    __tablename__ = "proposals"

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    freelancer_profile_id = Column(Integer, ForeignKey("freelancer_profiles.id", ondelete="CASCADE"), nullable=False, index=True)
    proposed_amount = Column(Numeric(precision=10, scale=2), nullable=False)
    cover_letter = Column(Text, nullable=False)
    status = Column(String(50), default="PENDING", nullable=False)  # PENDING, ACCEPTED, REJECTED

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationships
    project = relationship("Project", back_populates="proposals")
    freelancer = relationship("FreelancerProfile", foreign_keys=[freelancer_profile_id], backref="freelancer_proposals")
