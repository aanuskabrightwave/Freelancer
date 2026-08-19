from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.services.message_service import MessageService
from app.schemas.message import MessageCreate, MessageResponse, ConversationResponse, ConversationCreate

router = APIRouter()


@router.post("/messages/conversations", response_model=ConversationResponse, summary="Get or create a conversation thread")
def create_conversation(
    convo_in: ConversationCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Retrieve target freelancer profile's user account
    from app.repositories.freelancer_repository import FreelancerRepository
    from fastapi import HTTPException
    
    profile = FreelancerRepository.get_profile_by_id(db, convo_in.freelancer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Freelancer profile not found")
        
    if profile.user_id == current_user.id:
        raise HTTPException(status_code=400, detail="You cannot start a conversation with yourself")
        
    # Enforce active business relationship to prevent unsolicited messaging
    if current_user.role == "CLIENT" or current_user.role.value == "CLIENT":
        from app.models.booking import Booking
        from app.models.project import Proposal, Project
        
        # Check for any booking
        has_booking = db.query(Booking).filter(
            Booking.client_id == current_user.id,
            Booking.freelancer_profile_id == profile.id
        ).first()
        
        # Check for any project proposal
        has_proposal = db.query(Proposal).join(Project).filter(
            Project.client_id == current_user.id,
            Proposal.freelancer_profile_id == profile.id
        ).first()
        
        if not has_booking and not has_proposal:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail="You can only message freelancers with whom you have an active booking or proposal."
            )
            
    return MessageService.get_or_create_conversation(db, current_user.id, profile.user_id)


@router.get("/messages/conversations", response_model=List[ConversationResponse], summary="List my active conversation threads")
def get_conversations(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return MessageService.list_conversations(db, current_user.id)


@router.get("/messages/conversations/{id}/messages", response_model=List[MessageResponse], summary="Fetch messages log in conversation thread")
def get_conversation_messages(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return MessageService.get_conversation_messages(db, current_user.id, id)


@router.post("/messages/conversations/{id}", response_model=MessageResponse, status_code=status.HTTP_201_CREATED, summary="Send message in conversation thread")
def send_message(
    id: int,
    message_in: MessageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return MessageService.send_message(db, current_user.id, id, message_in.message_text)
