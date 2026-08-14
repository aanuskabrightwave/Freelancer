import enum
from sqlalchemy import Column, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class ReportReason(str, enum.Enum):
    HARASSMENT = "HARASSMENT"
    SPAM = "SPAM"
    FALSE_INFORMATION = "FALSE_INFORMATION"
    PERSONAL_INFORMATION = "PERSONAL_INFORMATION"
    ABUSIVE_LANGUAGE = "ABUSIVE_LANGUAGE"
    OTHER = "OTHER"


class ReportStatus(str, enum.Enum):
    OPEN = "OPEN"
    UNDER_REVIEW = "UNDER_REVIEW"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class ReviewReport(Base):
    __tablename__ = "review_reports"

    id = Column(Integer, primary_key=True, index=True)
    review_id = Column(Integer, ForeignKey("reviews.id", ondelete="CASCADE"), nullable=False, index=True)
    reported_by_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    reason = Column(Enum(ReportReason), nullable=False)
    details = Column(Text, nullable=True)
    status = Column(Enum(ReportStatus), default=ReportStatus.OPEN, nullable=False, index=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    review = relationship("Review", backref="reports")
    reporter = relationship("User", backref="reports_submitted")

    def __repr__(self) -> str:
        return f"<ReviewReport id={self.id} review_id={self.review_id} status={self.status}>"
