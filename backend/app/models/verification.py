import enum
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Enum, func
from sqlalchemy.orm import relationship
from app.core.database import Base
from app.models.freelancer_profile import VerificationStatus


class DocumentType(str, enum.Enum):
    IDENTITY_DOCUMENT = "IDENTITY_DOCUMENT"
    ADDRESS_PROOF = "ADDRESS_PROOF"
    BUSINESS_DOCUMENT = "BUSINESS_DOCUMENT"
    PORTFOLIO_PROOF = "PORTFOLIO_PROOF"
    OTHER = "OTHER"


class DocumentStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class FreelancerVerification(Base):
    __tablename__ = "freelancer_verifications"

    id = Column(Integer, primary_key=True, index=True)
    freelancer_profile_id = Column(
        Integer,
        ForeignKey("freelancer_profiles.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    status = Column(
        Enum(VerificationStatus),
        default=VerificationStatus.PENDING,
        nullable=False,
        index=True
    )
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    reviewed_by_admin_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)
    rejection_reason = Column(Text, nullable=True)
    admin_notes = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    freelancer_profile = relationship("FreelancerProfile", backref="verifications")
    reviewer = relationship("User", foreign_keys=[reviewed_by_admin_id])
    documents = relationship("VerificationDocument", back_populates="verification", cascade="all, delete-orphan")

    def __repr__(self) -> str:
        return f"<FreelancerVerification id={self.id} freelancer_profile_id={self.freelancer_profile_id} status={self.status}>"


class VerificationDocument(Base):
    __tablename__ = "verification_documents"

    id = Column(Integer, primary_key=True, index=True)
    verification_id = Column(
        Integer,
        ForeignKey("freelancer_verifications.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    document_type = Column(Enum(DocumentType), nullable=False)
    file_path = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=False)
    status = Column(Enum(DocumentStatus), default=DocumentStatus.PENDING, nullable=False)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    verification = relationship("FreelancerVerification", back_populates="documents")

    def __repr__(self) -> str:
        return f"<VerificationDocument id={self.id} type={self.document_type} status={self.status}>"
