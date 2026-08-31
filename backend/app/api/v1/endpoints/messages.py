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


# =============================================================================
# 5. SEND MESSAGE (Role-Protected & Legacy-Blocked)
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
    return AdminMessagingService.send_message(
        db=db,
        current_user=current_user,
        conversation_id=id,
        content=content,
        reply_to_message_id=payload.reply_to_message_id,
        file_ids=payload.file_ids
    )


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
