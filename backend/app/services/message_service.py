from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.message import Conversation, Message
from app.repositories.message_repository import MessageRepository


class MessageService:
    @staticmethod
    def get_or_create_conversation(db: Session, client_id: int, freelancer_id: int) -> Conversation:
        return MessageRepository.get_or_create_conversation(db, client_id, freelancer_id)

    @staticmethod
    def list_conversations(db: Session, user_id: int) -> list[Conversation]:
        return MessageRepository.get_user_conversations(db, user_id)

    @staticmethod
    def get_conversation_messages(db: Session, user_id: int, conversation_id: int) -> list[Message]:
        # 1. Fetch conversation
        conversation = MessageRepository.get_conversation_by_id(db, conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation thread not found."
            )

        # 2. Gatekeeping: must be participant in this chat
        if conversation.client_id != user_id and conversation.freelancer_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have access to this conversation."
            )

        return MessageRepository.get_conversation_messages(db, conversation_id)

    @staticmethod
    def send_message(db: Session, user_id: int, conversation_id: int, message_text: str) -> Message:
        conversation = MessageRepository.get_conversation_by_id(db, conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation thread not found."
            )

        # Gatekeeping: sender must be in this chat
        if conversation.client_id != user_id and conversation.freelancer_id != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to post messages here."
            )

        return MessageRepository.create_message(
            db,
            conversation_id=conversation_id,
            sender_id=user_id,
            text=message_text.strip(),
            is_system=False
        )
