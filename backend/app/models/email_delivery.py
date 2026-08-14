from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class EmailDelivery(Base):
    __tablename__ = "email_deliveries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    notification_id = Column(Integer, ForeignKey("notifications.id", ondelete="SET NULL"), nullable=True, index=True)
    
    recipient_email = Column(String(255), nullable=False)
    template_code = Column(String(100), nullable=False)
    subject = Column(String(255), nullable=False)
    status = Column(String(50), default="PENDING", nullable=False, index=True) # PENDING, SENT, FAILED, SKIPPED
    
    provider_message_id = Column(String(255), nullable=True)
    failure_reason = Column(Text, nullable=True)
    
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    # Relationships
    user = relationship("User", backref="email_deliveries")
    notification = relationship("Notification", backref="email_deliveries")

    def __repr__(self) -> str:
        return f"<EmailDelivery id={self.id} recipient={self.recipient_email} template={self.template_code} status={self.status}>"
