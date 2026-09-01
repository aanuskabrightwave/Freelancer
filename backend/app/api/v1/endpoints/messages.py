from typing import List, Optional
from fastapi import APIRouter, Depends, status, Query, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.message import ConversationType
from app.services.admin_messaging_service import AdminMessagingService
from app.repositories.message_repository import MessageRepository
from app.schemas.managed_messaging import (
    ManagedConversationListItem, ManagedConversationDetail,
    ManagedMessageOut, MessageSendPayload
)
from app.schemas.message import ConversationCreate

router = APIRouter()


# =============================================================================
# 1. CLIENT CONVERSATIONS
# =============================================================================
@router.get(
    "/client/messages/conversations",
    response_model=List[ManagedConversationListItem],
    summary="List Client-Admin conversations"
)
@router.get(
    "/client/conversations",
    response_model=List[ManagedConversationListItem],
    summary="Alias: List Client-Admin conversations"
)
def list_client_conversations(
    search: Optional[str] = Query(None),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.CLIENT and getattr(current_user.role, "value", None) != "CLIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only clients can access the client messaging inbox."
        )
    return AdminMessagingService.list_conversations(
        db=db,
        current_user=current_user,
        search=search,
        unread_only=unread_only
    )


# =============================================================================
# 2. FREELANCER CONVERSATIONS
# =============================================================================
@router.get(
    "/freelancer/messages/conversations",
    response_model=List[ManagedConversationListItem],
    summary="List Freelancer-Admin conversations"
)
@router.get(
    "/freelancer/conversations",
    response_model=List[ManagedConversationListItem],
    summary="Alias: List Freelancer-Admin conversations"
)
def list_freelancer_conversations(
    search: Optional[str] = Query(None),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER and getattr(current_user.role, "value", None) != "FREELANCER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only freelancers can access the creator messaging inbox."
        )
    return AdminMessagingService.list_conversations(
        db=db,
        current_user=current_user,
        search=search,
        unread_only=unread_only
    )


# =============================================================================
# 3. ADMIN CONVERSATIONS
# =============================================================================
@router.get(
    "/admin/messages/conversations",
    response_model=List[ManagedConversationListItem],
    summary="List all mediated conversations for Admin"
)
@router.get(
    "/admin/conversations",
    response_model=List[ManagedConversationListItem],
    summary="Alias: List all mediated conversations for Admin"
)
def list_admin_conversations(
    conversation_type: Optional[str] = Query(None),
    booking_id: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    search: Optional[str] = Query(None),
    unread_only: bool = Query(False),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.ADMIN and getattr(current_user.role, "value", None) != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can access the admin messaging console."
        )
    return AdminMessagingService.list_conversations(
        db=db,
        current_user=current_user,
        conversation_type_filter=conversation_type,
        booking_id_filter=booking_id,
        project_id_filter=project_id,
        search=search,
        unread_only=unread_only
    )


# =============================================================================
# 4. CONVERSATION DETAIL (Role-Protected)
# =============================================================================
@router.get(
    "/messages/conversations/{id}",
    response_model=ManagedConversationDetail,
    summary="Fetch conversation details, metadata, and messages"
)
def get_conversation_detail(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return AdminMessagingService.get_conversation_detail(db, current_user, id)


import json
import asyncio
from fastapi import WebSocket, WebSocketDisconnect
from app.services.ws_manager import ws_manager
from app.core.security import decode_token

# =============================================================================
# 5. SEND MESSAGE (Role-Protected & Broadcasted)
# =============================================================================
@router.post(
    "/messages/conversations/{id}/messages",
    response_model=ManagedMessageOut,
    status_code=status.HTTP_201_CREATED,
    summary="Send message in conversation thread"
)
@router.post(
    "/messages/conversations/{id}",
    response_model=ManagedMessageOut,
    status_code=status.HTTP_201_CREATED,
    summary="Alias: Send message in conversation thread"
)
def send_message(
    id: int,
    payload: MessageSendPayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    content = payload.content or payload.message_text or ""
    msg_out = AdminMessagingService.send_message(
        db=db,
        current_user=current_user,
        conversation_id=id,
        content=content,
        reply_to_message_id=payload.reply_to_message_id,
        file_ids=payload.file_ids
    )

    try:
        payload_dict = {
            "type": "new_message",
            "conversation_id": id,
            "message": {
                "id": msg_out.id,
                "conversation_id": msg_out.conversation_id,
                "sender_id": msg_out.sender_id,
                "sender_name": msg_out.sender_name,
                "sender_role": msg_out.sender_role,
                "content": msg_out.content,
                "created_at": msg_out.created_at.isoformat() if hasattr(msg_out.created_at, "isoformat") else str(msg_out.created_at),
                "is_from_admin": msg_out.is_from_admin,
            }
        }
        loop = asyncio.get_event_loop()
        if loop.is_running():
            asyncio.create_task(ws_manager.broadcast_to_conversation(id, payload_dict))
    except Exception:
        pass

    return msg_out


@router.websocket("/ws/{conversation_id}")
async def websocket_endpoint(
    websocket: WebSocket,
    conversation_id: int,
    token: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    if not token:
        token = websocket.cookies.get("access_token")
    if not token:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        token_payload = decode_token(token, "access")
        user_id = int(token_payload.get("sub"))
        user = db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    try:
        AdminMessagingService._validate_access(db, user, conversation_id)
    except Exception:
        await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
        return

    await ws_manager.connect(websocket, conversation_id, user.id)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg_json = json.loads(data)
                if msg_json.get("type") == "typing":
                    await ws_manager.broadcast_to_conversation(
                        conversation_id,
                        {
                            "type": "typing",
                            "user_id": user.id,
                            "user_name": user.full_name,
                            "conversation_id": conversation_id
                        }
                    )
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, conversation_id, user.id)



# =============================================================================
# 6. MARK READ & UNREAD COUNTS
# =============================================================================
@router.post(
    "/messages/conversations/{id}/read",
    response_model=dict,
    summary="Mark conversation as read for current user"
)
def mark_conversation_read(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return AdminMessagingService.mark_conversation_read(db, current_user, id)


@router.get(
    "/messages/conversations/{id}/unread",
    response_model=dict,
    summary="Get unread message count for current user in conversation"
)
def get_conversation_unread_count(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    count = MessageRepository.get_unread_count(db, id, current_user.id)
    return {"conversation_id": id, "unread_count": count}


# =============================================================================
# 7. LEGACY CONVERSATION CREATION BLOCKER
# =============================================================================
@router.post(
    "/messages/conversations",
    summary="Legacy conversation creation (Blocked for direct Client-Freelancer chats)"
)
def create_conversation(
    convo_in: ConversationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Non-admin direct conversation creation is permanently disabled in the managed model
    if current_user.role != UserRole.ADMIN and getattr(current_user.role, "value", None) != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Direct client-to-freelancer conversations are disabled. All communications are managed through dedicated Admin channels."
        )

    # Admin utility if needed
    from app.services.message_service import MessageService
    client_id = convo_in.client_id or current_user.id
    freelancer_id = convo_in.freelancer_id
    if not freelancer_id:
        raise HTTPException(status_code=400, detail="freelancer_id is required")
    return MessageService.get_or_create_conversation(db, client_id, freelancer_id)


# =============================================================================
# 8. LEGACY GET CONVERSATIONS & MESSAGES (Preserved)
# =============================================================================
@router.get(
    "/messages/conversations",
    response_model=List[ManagedConversationListItem],
    summary="List active conversation threads for current user"
)
def get_conversations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return AdminMessagingService.list_conversations(db, current_user)


@router.get(
    "/messages/conversations/{id}/messages",
    response_model=List[ManagedMessageOut],
    summary="Fetch messages log in conversation thread"
)
def get_conversation_messages(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    detail = AdminMessagingService.get_conversation_detail(db, current_user, id)
    return detail.messages
