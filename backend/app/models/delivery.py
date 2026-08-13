import enum
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Enum, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class DeliveryType(str, enum.Enum):
    PREVIEW = "PREVIEW"
    REVISION = "REVISION"
    FINAL = "FINAL"


class DeliveryStatus(str, enum.Enum):
    SUBMITTED = "SUBMITTED"
    UNDER_REVIEW = "UNDER_REVIEW"
    REVISION_REQUESTED = "REVISION_REQUESTED"
    APPROVED = "APPROVED"
    SUPERSEDED = "SUPERSEDED"


class Delivery(Base):
    __tablename__ = "deliveries"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(
        Integer,
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    workspace_id = Column(
        Integer,
        ForeignKey("booking_workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    delivery_type = Column(Enum(DeliveryType), default=DeliveryType.PREVIEW, nullable=False)
    version = Column(Integer, default=1, nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=True)
    status = Column(Enum(DeliveryStatus), default=DeliveryStatus.SUBMITTED, nullable=False)
    
    submitted_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    submitted_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    approved_at = Column(DateTime(timezone=True), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    booking = relationship("Booking", backref="deliveries")
    workspace = relationship("BookingWorkspace", backref="deliveries")
    submitted_by = relationship("User")


class DeliveryFile(Base):
    __tablename__ = "delivery_files"

    id = Column(Integer, primary_key=True, index=True)
    delivery_id = Column(
        Integer,
        ForeignKey("deliveries.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    workspace_file_id = Column(
        Integer,
        ForeignKey("workspace_files.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    sort_order = Column(Integer, default=0, nullable=False)

    delivery = relationship("Delivery", backref="delivery_files")
    workspace_file = relationship("WorkspaceFile")
