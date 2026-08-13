from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Table, func
from sqlalchemy.orm import relationship
from app.core.database import Base

# Association table for freelancer_profiles <-> skills (many-to-many)
freelancer_skills = Table(
    "freelancer_skills",
    Base.metadata,
    Column(
        "freelancer_profile_id",
        Integer,
        ForeignKey("freelancer_profiles.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "skill_id",
        Integer,
        ForeignKey("skills.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Skill(Base):
    __tablename__ = "skills"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, index=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Back-reference relationship
    freelancer_profiles = relationship(
        "FreelancerProfile",
        secondary=freelancer_skills,
        back_populates="skills",
    )

    def __repr__(self) -> str:
        return f"<Skill id={self.id} name='{self.name}'>"
