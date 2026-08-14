import enum
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, Text, Enum, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class MessageType(str, enum.Enum):
    TEXT = "TEXT"
    FILE = "FILE"
    IMAGE = "IMAGE"
    SYSTEM = "SYSTEM"
    DELIVERY = "DELIVERY"
    REVISION = "REVISION"


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    freelancer_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    workspace_id = Column(
        Integer,
        ForeignKey("booking_workspaces.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )
    booking_id = Column(
        Integer,
        ForeignKey("bookings.id", ondelete="CASCADE"),
        nullable=True,
        index=True
    )

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False
    )

    # Relationships
    client = relationship("User", foreign_keys=[client_id], backref="client_conversations")
    freelancer = relationship("User", foreign_keys=[freelancer_id], backref="freelancer_conversations")
    messages = relationship(
        "Message",
        back_populates="conversation",
        cascade="all, delete-orphan",
        order_by="Message.created_at.asc()"
    )

    def __repr__(self) -> str:
        return f"<Conversation id={self.id} client_id={self.client_id} freelancer_id={self.freelancer_id}>"


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(
        Integer,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    sender_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    
    # Text contents
    content = Column(Text, nullable=True)
    message_text = Column(Text, nullable=True) # Backward compatibility

    # Message categorization / state flags
    message_type = Column(Enum(MessageType), default=MessageType.TEXT, nullable=False)
    reply_to_message_id = Column(
        Integer,
        ForeignKey("messages.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )
    is_edited = Column(Boolean, default=False, nullable=False)
    is_deleted = Column(Boolean, default=False, nullable=False)
    is_system = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)

    # Relationships
    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id])
    reply_to = relationship("Message", remote_side=[id], backref="replies")

    def __repr__(self) -> str:
        return f"<Message id={self.id} conversation_id={self.conversation_id} sender_id={self.sender_id}>"
