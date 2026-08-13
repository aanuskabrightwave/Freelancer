from fastapi import APIRouter, Depends, status, Query, WebSocket, WebSocketDisconnect, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.models.booking import Booking
from app.services.messaging_service import MessagingService
from app.services.workspace_service import WorkspaceService
from app.schemas.message import MessageResponse, MessageCreatePayload, MessageEditPayload

router = APIRouter()


@router.get("/bookings/{booking_id}/messages", response_model=List[MessageResponse], summary="Get workspace conversation messages")
def get_workspace_messages(
    booking_id: int,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    search: Optional[str] = Query(None),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return MessagingService.get_workspace_messages(
        db, current_user, booking_id, limit, offset, search
    )


@router.post("/bookings/{booking_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED, summary="Send message in workspace")
def send_workspace_message(
    booking_id: int,
    payload: MessageCreatePayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return MessagingService.send_workspace_message(
        db,
        current_user,
        booking_id,
        payload.content,
        payload.reply_to_message_id,
        payload.file_ids
    )


@router.patch("/messages/{message_id}", response_model=MessageResponse, summary="Edit text message")
def edit_text_message(
    message_id: int,
    payload: MessageEditPayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return MessagingService.edit_message(db, current_user, message_id, payload.content)


@router.delete("/messages/{message_id}", response_model=MessageResponse, summary="Soft delete message")
def delete_message(
    message_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return MessagingService.delete_message(db, current_user, message_id)


@router.post("/bookings/{booking_id}/messages/read", response_model=dict, summary="Mark messages as read")
def mark_messages_read(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Fetch workspace
    workspace = WorkspaceService.get_or_create_workspace(db, current_user, booking_id)
    # Find latest message in workspace
    from app.models.message import Conversation
    conversation = db.query(Conversation).filter(Conversation.workspace_id == workspace.id).first()
    if conversation:
        from app.models.message import Message as MessageModel
        latest = db.query(MessageModel).filter(MessageModel.conversation_id == conversation.id).order_by(MessageModel.created_at.desc()).first()
        if latest:
            from app.repositories.message_repository import MessageRepository
            MessageRepository.update_read_marker(db, conversation.id, current_user.id, latest.id)

    return {"status": "success", "message": "Marked messages as read"}


@router.get("/bookings/{booking_id}/messages/unread", response_model=dict, summary="Get unread message count")
def get_unread_message_count(
    booking_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    count = MessagingService.get_unread_count(db, current_user, booking_id)
    return {"unread_count": count}


# Websocket routing stub
@router.websocket("/ws/bookings/{booking_id}")
async def booking_websocket_endpoint(websocket: WebSocket, booking_id: int, token: Optional[str] = Query(None)):
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    db = next(get_db())
    try:
        from app.core.security import decode_access_token
        # decode JWT
        payload = decode_access_token(token)
        user_id = int(payload["sub"])
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        WorkspaceService.validate_membership(db, user, booking)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Echo: {data}")
    except WebSocketDisconnect:
        pass
