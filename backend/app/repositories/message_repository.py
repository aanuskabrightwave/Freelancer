from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from datetime import datetime

from app.models.message import Conversation, Message, MessageType
from app.models.conversation_participant import ConversationParticipant
from app.models.workspace_file import MessageAttachment


class MessageRepository:
    @staticmethod
    def get_or_create_conversation(db: Session, client_id: int, freelancer_id: int) -> Conversation:
        # Check if conversation already exists between client and freelancer (direct message outside workspace)
        conversation = db.query(Conversation).filter(
            Conversation.workspace_id.is_(None),
            or_(
                and_(Conversation.client_id == client_id, Conversation.freelancer_id == freelancer_id),
                and_(Conversation.client_id == freelancer_id, Conversation.freelancer_id == client_id)
            )
        ).first()

        if not conversation:
            # Create new one
            conversation = Conversation(client_id=client_id, freelancer_id=freelancer_id)
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

        return conversation

    @staticmethod
    def get_or_create_workspace_conversation(db: Session, workspace_id: int, booking_id: int, client_id: int, freelancer_id: int) -> Conversation:
        conversation = db.query(Conversation).filter(Conversation.workspace_id == workspace_id).first()
        if not conversation:
            conversation = Conversation(
                workspace_id=workspace_id,
                booking_id=booking_id,
                client_id=client_id,
                freelancer_id=freelancer_id
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
            
            # Setup initial participant records
            MessageRepository.get_or_create_participant(db, conversation.id, client_id)
            MessageRepository.get_or_create_participant(db, conversation.id, freelancer_id)
            
        return conversation

    @staticmethod
    def get_conversation_by_id(db: Session, conversation_id: int) -> Optional[Conversation]:
        return db.query(Conversation).filter(Conversation.id == conversation_id).first()

    @staticmethod
    def get_user_conversations(db: Session, user_id: int) -> List[Conversation]:
        return db.query(Conversation).filter(
            or_(
                Conversation.client_id == user_id,
                Conversation.freelancer_id == user_id
            )
        ).order_by(Conversation.updated_at.desc()).all()

    @staticmethod
    def create_message(db: Session, conversation_id: int, sender_id: int, text: str, is_system: bool = False, message_type: MessageType = MessageType.TEXT, reply_to_message_id: Optional[int] = None) -> Message:
        db_message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=text,
            message_text=text,
            is_system=is_system,
            message_type=message_type,
            reply_to_message_id=reply_to_message_id
        )
        db.add(db_message)
        
        # Touch updated_at
        conversation = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if conversation:
            conversation.updated_at = func.now()

        db.commit()
        db.refresh(db_message)
        return db_message

    @staticmethod
    def get_conversation_messages(db: Session, conversation_id: int) -> List[Message]:
        return db.query(Message).filter(Message.conversation_id == conversation_id).order_by(Message.created_at.asc()).all()

    @staticmethod
    def get_workspace_messages_paginated(
        db: Session,
        conversation_id: int,
        limit: int = 50,
        offset: int = 0,
        search_query: Optional[str] = None
    ) -> List[Message]:
        query = db.query(Message).filter(Message.conversation_id == conversation_id)
        if search_query:
            query = query.filter(Message.content.ilike(f"%{search_query}%"))
        # Oldest-to-newest for UI presentation, but paginate using desc order or offset
        # Loading previous messages cleanly means fetching in desc created_at and reversing them in service
        return query.order_by(Message.created_at.desc()).limit(limit).offset(offset).all()

    @staticmethod
    def get_message_by_id(db: Session, message_id: int) -> Optional[Message]:
        return db.query(Message).filter(Message.id == message_id).first()

    @staticmethod
    def update_message(db: Session, message: Message, new_text: str) -> Message:
        message.content = new_text
        message.message_text = new_text
        message.is_edited = True
        db.commit()
        db.refresh(message)
        return message

    @staticmethod
    def soft_delete_message(db: Session, message: Message) -> Message:
        message.is_deleted = True
        db.commit()
        db.refresh(message)
        return message

    # Participant state tracking helpers
    @staticmethod
    def get_or_create_participant(db: Session, conversation_id: int, user_id: int) -> ConversationParticipant:
        part = db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id
        ).first()
        if not part:
            part = ConversationParticipant(conversation_id=conversation_id, user_id=user_id)
            db.add(part)
            db.commit()
            db.refresh(part)
        return part

    @staticmethod
    def update_read_marker(db: Session, conversation_id: int, user_id: int, message_id: int) -> None:
        part = MessageRepository.get_or_create_participant(db, conversation_id, user_id)
        part.last_read_message_id = message_id
        part.last_read_at = datetime.now()
        db.commit()

    @staticmethod
    def get_unread_count(db: Session, conversation_id: int, user_id: int) -> int:
        part = db.query(ConversationParticipant).filter(
            ConversationParticipant.conversation_id == conversation_id,
            ConversationParticipant.user_id == user_id
        ).first()
        if not part or not part.last_read_message_id:
            # Count all messages in conversation where sender is not user
            return db.query(func.count(Message.id)).filter(
                Message.conversation_id == conversation_id,
                Message.sender_id != user_id
            ).scalar() or 0

        return db.query(func.count(Message.id)).filter(
            Message.conversation_id == conversation_id,
            Message.sender_id != user_id,
            Message.id > part.last_read_message_id
        ).scalar() or 0

    @staticmethod
    def create_attachment(db: Session, message_id: int, workspace_file_id: int) -> MessageAttachment:
        db_attach = MessageAttachment(message_id=message_id, workspace_file_id=workspace_file_id)
        db.add(db_attach)
        db.commit()
        db.refresh(db_attach)
        return db_attach
