from sqlalchemy import Column, Integer, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship, backref
from app.core.database import Base


class NotificationPreferences(Base):
    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False, index=True)
    
    in_app_enabled = Column(Boolean, default=True, nullable=False)
    email_enabled = Column(Boolean, default=True, nullable=False)
    
    # Specific categories email triggers
    project_updates_email = Column(Boolean, default=True, nullable=False)
    proposal_updates_email = Column(Boolean, default=True, nullable=False)
    booking_updates_email = Column(Boolean, default=True, nullable=False)
    message_email = Column(Boolean, default=True, nullable=False)
    payment_email = Column(Boolean, default=True, nullable=False)
    delivery_email = Column(Boolean, default=True, nullable=False)
    review_email = Column(Boolean, default=True, nullable=False)
    payout_email = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    user = relationship("User", backref=backref("preferences_obj", uselist=False))

    def __repr__(self) -> str:
        return f"<NotificationPreferences id={self.id} user_id={self.user_id} email_enabled={self.email_enabled}>"
