import enum
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Enum, JSON, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class WorkspaceEventType(str, enum.Enum):
    BOOKING_CONFIRMED = "BOOKING_CONFIRMED"
    WORK_STARTED = "WORK_STARTED"
    FILE_UPLOADED = "FILE_UPLOADED"
    PREVIEW_SUBMITTED = "PREVIEW_SUBMITTED"
    REVISION_REQUESTED = "REVISION_REQUESTED"
    REVISION_SUBMITTED = "REVISION_SUBMITTED"
    FINAL_DELIVERY = "FINAL_DELIVERY"
    BOOKING_COMPLETED = "BOOKING_COMPLETED"
    MESSAGE_SYSTEM = "MESSAGE_SYSTEM"


class WorkspaceEvent(Base):
    __tablename__ = "workspace_events"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(
        Integer,
        ForeignKey("booking_workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    event_type = Column(Enum(WorkspaceEventType), nullable=False)
    actor_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True
    )
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    metadata_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    workspace = relationship("BookingWorkspace", backref="events")
    actor = relationship("User")

    def __repr__(self) -> str:
        return f"<WorkspaceEvent id={self.id} type={self.event_type}>"
