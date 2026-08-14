from enum import Enum as PyEnum
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime, ForeignKey, Index, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class NotificationType(str, PyEnum):
    ACCOUNT = "ACCOUNT"
    PROJECT = "PROJECT"
    PROPOSAL = "PROPOSAL"
    BOOKING = "BOOKING"
    MESSAGE = "MESSAGE"
    PAYMENT = "PAYMENT"
    DELIVERY = "DELIVERY"
    REVISION = "REVISION"
    REVIEW = "REVIEW"
    PAYOUT = "PAYOUT"
    SYSTEM = "SYSTEM"


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    notification_type = Column(String(50), nullable=False)
    event_code = Column(String(100), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    action_url = Column(String(512), nullable=True)
    
    # Entity reference for polymorphic associations
    entity_type = Column(String(100), nullable=True, index=True)
    entity_id = Column(Integer, nullable=True, index=True)
    
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime(timezone=True), nullable=True)
    deduplication_key = Column(String(255), unique=True, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", backref="notifications")

    # Composite index for quick dashboard list lookups
    __table_args__ = (
        Index("ix_notifications_user_unread_created", "user_id", "is_read", "created_at"),
    )

    def __repr__(self) -> str:
        return f"<Notification id={self.id} user_id={self.user_id} event_code={self.event_code} is_read={self.is_read}>"
