import enum
from sqlalchemy import Column, DateTime, ForeignKey, Integer, String, Text, Enum, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class FileCategory(str, enum.Enum):
    REFERENCE = "REFERENCE"
    PROJECT_FILE = "PROJECT_FILE"
    PREVIEW = "PREVIEW"
    FINAL_DELIVERY = "FINAL_DELIVERY"
    DOCUMENT = "DOCUMENT"
    OTHER = "OTHER"


class WorkspaceFile(Base):
    __tablename__ = "workspace_files"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(
        Integer,
        ForeignKey("booking_workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    uploaded_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    file_category = Column(Enum(FileCategory), default=FileCategory.OTHER, nullable=False)
    original_name = Column(String(255), nullable=False)
    stored_name = Column(String(255), nullable=False)
    file_url = Column(String(500), nullable=False)
    mime_type = Column(String(100), nullable=True)
    file_size = Column(Integer, nullable=True) # size in bytes
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    workspace = relationship("BookingWorkspace", backref="files")
    uploaded_by = relationship("User")


class WorkspaceLink(Base):
    __tablename__ = "workspace_links"

    id = Column(Integer, primary_key=True, index=True)
    workspace_id = Column(
        Integer,
        ForeignKey("booking_workspaces.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    created_by_user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False
    )
    label = Column(String(255), nullable=False)
    url = Column(String(500), nullable=False)
    link_type = Column(String(50), default="EXTERNAL", nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)

    workspace = relationship("BookingWorkspace", backref="links")
    created_by = relationship("User")


class MessageAttachment(Base):
    __tablename__ = "message_attachments"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(
        Integer,
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    workspace_file_id = Column(
        Integer,
        ForeignKey("workspace_files.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    message = relationship("Message", backref="attachments")
    workspace_file = relationship("WorkspaceFile")
