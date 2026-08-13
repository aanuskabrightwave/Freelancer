from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone

from app.models.booking import Booking, BookingStatus
from app.models.user import User, UserRole
from app.models.message import Conversation, Message, MessageType
from app.repositories.booking_repository import BookingRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.workspace_repository import WorkspaceRepository
from app.services.workspace_service import WorkspaceService


class MessagingService:
    @staticmethod
    def get_workspace_messages(
        db: Session,
        user: User,
        booking_id: int,
        limit: int = 50,
        offset: int = 0,
        search: Optional[str] = None
    ) -> List[Message]:
        workspace = WorkspaceService.get_or_create_workspace(db, user, booking_id)
        
        # Resolve conversation
        booking = BookingRepository.get_by_id(db, booking_id)
        conversation = db.query(Conversation).filter(Conversation.workspace_id == workspace.id).first()
        if not conversation:
            return []

        # Fetch messages (desc order in repo for offset loading)
        messages = MessageRepository.get_workspace_messages_paginated(
            db, conversation.id, limit, offset, search
        )
        
        # Turn oldest-to-newest for client view
        messages.reverse()

        # Update read marker marker to the latest message ID
        if messages:
            latest_msg = messages[-1]
            MessageRepository.update_read_marker(db, conversation.id, user.id, latest_msg.id)

        return messages

    @staticmethod
    def send_workspace_message(
        db: Session,
        user: User,
        booking_id: int,
        content: str,
        reply_to_message_id: Optional[int] = None,
        file_ids: Optional[List[int]] = None
    ) -> Message:
        workspace = WorkspaceService.get_or_create_workspace(db, user, booking_id)
        
        # Verify read-only closed workspace
        booking = BookingRepository.get_by_id(db, booking_id)
        if booking.status in [BookingStatus.COMPLETED, BookingStatus.CANCELLED]:
            raise HTTPException(status_code=400, detail="Booking is closed. Workspace messaging is read-only.")

        conversation = db.query(Conversation).filter(Conversation.workspace_id == workspace.id).first()
        if not conversation:
            raise HTTPException(status_code=404, detail="Workspace chat channel not found.")

        # Determine message type based on attachments
        msg_type = MessageType.TEXT
        attachments_records = []
        if file_ids:
            for fid in file_ids:
                file = WorkspaceRepository.get_file_by_id(db, fid)
                if not file or file.workspace_id != workspace.id:
                    raise HTTPException(status_code=404, detail=f"File ID {fid} not found in workspace.")
                attachments_records.append(file)
            
            # Detect IMAGE vs FILE type
            main_mime = attachments_records[0].mime_type or ""
            if main_mime.startswith("image/"):
                msg_type = MessageType.IMAGE
            else:
                msg_type = MessageType.FILE

        # Create message
        db_message = MessageRepository.create_message(
            db,
            conversation_id=conversation.id,
            sender_id=user.id,
            text=content,
            is_system=False,
            message_type=msg_type,
            reply_to_message_id=reply_to_message_id
        )

        # Link attachments
        for f in attachments_records:
            MessageRepository.create_attachment(db, db_message.id, f.id)

        # Automatically mark as read for sender
        MessageRepository.update_read_marker(db, conversation.id, user.id, db_message.id)

        return db_message

    @staticmethod
    def edit_message(db: Session, user: User, message_id: int, new_content: str) -> Message:
        message = MessageRepository.get_message_by_id(db, message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Message not found.")

        if message.sender_id != user.id:
            raise HTTPException(status_code=403, detail="Only message sender can modify content.")

        # Validate edit window (15 minutes)
        # Handle offset timezone differences safely
        created_time = message.created_at
        naive_created = created_time.replace(tzinfo=None)
        
        diff_local = abs((datetime.now() - naive_created).total_seconds())
        diff_utc = abs((datetime.now(timezone.utc).replace(tzinfo=None) - naive_created).total_seconds())
        elapsed_seconds = min(diff_local, diff_utc)

        if elapsed_seconds > 15 * 60:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Edits are allowed only within 15 minutes of sending."
            )

        return MessageRepository.update_message(db, message, new_content)

    @staticmethod
    def delete_message(db: Session, user: User, message_id: int) -> Message:
        message = MessageRepository.get_message_by_id(db, message_id)
        if not message:
            raise HTTPException(status_code=404, detail="Message not found.")

        if message.sender_id != user.id and user.role != UserRole.ADMIN:
            raise HTTPException(status_code=403, detail="Unauthorized message deletion request.")

        return MessageRepository.soft_delete_message(db, message)

    @staticmethod
    def get_unread_count(db: Session, user: User, booking_id: int) -> int:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            return 0
        workspace = WorkspaceRepository.get_by_booking_id(db, booking.id)
        if not workspace:
            return 0
        conversation = db.query(Conversation).filter(Conversation.workspace_id == workspace.id).first()
        if not conversation:
            return 0
        return MessageRepository.get_unread_count(db, conversation.id, user.id)
