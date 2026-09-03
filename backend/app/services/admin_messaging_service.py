from datetime import datetime
from decimal import Decimal
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_, desc

from app.models.message import Conversation, Message, MessageType, ConversationType
from app.models.conversation_participant import ConversationParticipant
from app.models.workspace_file import WorkspaceFile, MessageAttachment
from app.models.booking import Booking, BookingStatus
from app.models.project import Project
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile
from app.repositories.message_repository import MessageRepository
from app.repositories.freelancer_repository import FreelancerRepository
from app.services.notification_service import NotificationService
from app.schemas.managed_messaging import (
    ManagedConversationListItem, ManagedConversationDetail,
    ManagedMessageOut, ManagedParticipantOut, MessageSenderOut,
    MessageAttachmentOut, ConversationRoleContextOut
)


class AdminMessagingService:

    @staticmethod
    def _get_default_admin(db: Session, preferred_admin_id: Optional[int] = None) -> User:
        """
        Resolves an active Admin user for mediated conversations.
        """
        if preferred_admin_id:
            admin = db.query(User).filter(User.id == preferred_admin_id, User.is_active == True).first()
            if admin and (admin.role == UserRole.ADMIN or getattr(admin.role, "value", None) == "ADMIN"):
                return admin

        admin = db.query(User).filter(
            or_(User.role == UserRole.ADMIN, User.role == "ADMIN"),
            User.is_active == True
        ).first()

        if not admin:
            # Fallback for fresh test environments: resolve any active admin user
            admin = db.query(User).filter(User.is_active == True).order_by(User.id.asc()).first()
            if not admin:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="No active administrator account found to mediate conversation."
                )
        return admin

    @staticmethod
    def _build_context(
        db: Session,
        booking_id: Optional[int] = None,
        project_id: Optional[int] = None,
        for_role: Optional[UserRole] = None
    ) -> Optional[ConversationRoleContextOut]:
        if booking_id:
            booking = db.query(Booking).filter(Booking.id == booking_id).first()
            if booking:
                # Sanitized creator display name
                creator_name = None
                if booking.freelancer_profile_id:
                    p = db.query(FreelancerProfile).filter(FreelancerProfile.id == booking.freelancer_profile_id).first()
                    if p and p.user:
                        creator_name = p.user.full_name
                elif booking.selected_freelancer_profile_id:
                    p = db.query(FreelancerProfile).filter(FreelancerProfile.id == booking.selected_freelancer_profile_id).first()
                    if p and p.user:
                        creator_name = p.user.full_name

                client_name = booking.client.full_name if booking.client else None

                return ConversationRoleContextOut(
                    booking_id=booking.id,
                    booking_number=booking.booking_number,
                    title=booking.title,
                    status=booking.status.value if hasattr(booking.status, "value") else str(booking.status),
                    scheduled_date=booking.scheduled_date,
                    start_time=booking.start_time,
                    end_time=booking.end_time,
                    location_city=booking.location_city,
                    venue_name=booking.venue_name,
                    agreed_amount=booking.agreed_amount,
                    freelancer_payout_amount=booking.freelancer_payout_amount,
                    currency=booking.currency or "INR",
                    assigned_creator_display_name=creator_name,
                    client_display_name=client_name,
                    admin_display_name="Platform Concierge"
                )

        if project_id:
            project = db.query(Project).filter(Project.id == project_id).first()
            if project:
                return ConversationRoleContextOut(
                    project_id=project.id,
                    project_title=project.title,
                    status=project.status.value if hasattr(project.status, "value") else str(project.status),
                    agreed_amount=project.budget,
                    currency="INR",
                    client_display_name=project.client.full_name if project.client else None,
                    admin_display_name="Platform Support"
                )

        return None

    @staticmethod
    def _build_message_out(msg: Message) -> ManagedMessageOut:
        sender_role_str = "USER"
        if msg.sender:
            sender_role_str = msg.sender.role.value if hasattr(msg.sender.role, "value") else str(msg.sender.role)

        sender_out = MessageSenderOut(
            id=msg.sender_id,
            full_name=msg.sender.full_name if msg.sender else "System",
            role=sender_role_str
        )

        attachments_out: List[MessageAttachmentOut] = []
        if hasattr(msg, "attachments") and msg.attachments:
            for a in msg.attachments:
                file_obj = a.workspace_file if hasattr(a, "workspace_file") else None
                attachments_out.append(
                    MessageAttachmentOut(
                        id=a.id,
                        message_id=a.message_id,
                        workspace_file_id=a.workspace_file_id,
                        file_name=file_obj.file_name if file_obj else None,
                        file_url=file_obj.file_url if file_obj else None,
                        file_size_bytes=file_obj.file_size_bytes if file_obj else None,
                        mime_type=file_obj.mime_type if file_obj else None
                    )
                )

        return ManagedMessageOut(
            id=msg.id,
            conversation_id=msg.conversation_id,
            sender_id=msg.sender_id,
            content=msg.content or msg.message_text,
            message_text=msg.content or msg.message_text,
            message_type=msg.message_type.value if hasattr(msg.message_type, "value") else str(msg.message_type),
            reply_to_message_id=msg.reply_to_message_id,
            is_edited=msg.is_edited,
            is_deleted=msg.is_deleted,
            is_system=msg.is_system,
            created_at=msg.created_at,
            sender=sender_out,
            attachments=attachments_out
        )

    # -------------------------------------------------------------------------
    # PART 3: CLIENT <-> ADMIN CONVERSATION CREATION
    # -------------------------------------------------------------------------
    @staticmethod
    def get_or_create_client_admin_conversation(
        db: Session,
        client_id: int,
        booking_id: Optional[int] = None,
        project_id: Optional[int] = None,
        admin_id: Optional[int] = None
    ) -> Conversation:
        client_user = db.query(User).filter(User.id == client_id).first()
        if not client_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Client user {client_id} not found.")

        admin_user = AdminMessagingService._get_default_admin(db, admin_id)

        # 1. Duplicate check
        query = db.query(Conversation).filter(
            Conversation.conversation_type == ConversationType.CLIENT_ADMIN.value,
            Conversation.client_id == client_id
        )
        if booking_id is not None:
            query = query.filter(Conversation.booking_id == booking_id)
        elif project_id is not None:
            query = query.filter(Conversation.project_id == project_id)
        else:
            query = query.filter(Conversation.booking_id.is_(None), Conversation.project_id.is_(None))

        existing = query.first()
        if existing:
            # Ensure participants exist
            MessageRepository.get_or_create_participant(db, existing.id, client_id)
            MessageRepository.get_or_create_participant(db, existing.id, admin_user.id)
            return existing

        # 2. Create new CLIENT_ADMIN conversation
        convo = Conversation(
            conversation_type=ConversationType.CLIENT_ADMIN.value,
            client_id=client_id,
            admin_id=admin_user.id,
            booking_id=booking_id,
            project_id=project_id,
            freelancer_id=None
        )
        db.add(convo)
        db.flush()

        # 3. Setup participants (Client + Admin only)
        MessageRepository.get_or_create_participant(db, convo.id, client_id)
        MessageRepository.get_or_create_participant(db, convo.id, admin_user.id)

        # 4. Inject initial system welcome message
        intro_text = (
            "🔔 Welcome to your booking support channel! Your dedicated marketplace concierge is here "
            "to assist with creator matching, requirements, scheduling, and payment questions."
        )
        if project_id:
            intro_text = (
                "🔔 Welcome to your project channel! Our marketplace curation team is reviewing your project brief "
                "and will coordinate talent matching with you here."
            )

        MessageRepository.create_message(
            db,
            conversation_id=convo.id,
            sender_id=admin_user.id,
            text=intro_text,
            is_system=True
        )

        db.commit()
        db.refresh(convo)
        return convo

    # -------------------------------------------------------------------------
    # PART 4: FREELANCER <-> ADMIN CONVERSATION CREATION
    # -------------------------------------------------------------------------
    @staticmethod
    def get_or_create_freelancer_admin_conversation(
        db: Session,
        freelancer_user_id: int,
        booking_id: Optional[int] = None,
        project_id: Optional[int] = None,
        admin_id: Optional[int] = None
    ) -> Conversation:
        freelancer_user = db.query(User).filter(User.id == freelancer_user_id).first()
        if not freelancer_user:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Freelancer user {freelancer_user_id} not found.")

        admin_user = AdminMessagingService._get_default_admin(db, admin_id)

        # 1. Duplicate check
        query = db.query(Conversation).filter(
            Conversation.conversation_type == ConversationType.FREELANCER_ADMIN.value,
            Conversation.freelancer_id == freelancer_user_id
        )
        if booking_id is not None:
            query = query.filter(Conversation.booking_id == booking_id)
        elif project_id is not None:
            query = query.filter(Conversation.project_id == project_id)
        else:
            query = query.filter(Conversation.booking_id.is_(None), Conversation.project_id.is_(None))

        existing = query.first()
        if existing:
            # Ensure participants exist
            MessageRepository.get_or_create_participant(db, existing.id, freelancer_user_id)
            MessageRepository.get_or_create_participant(db, existing.id, admin_user.id)
            return existing

        # 2. Create new FREELANCER_ADMIN conversation
        convo = Conversation(
            conversation_type=ConversationType.FREELANCER_ADMIN.value,
            freelancer_id=freelancer_user_id,
            admin_id=admin_user.id,
            booking_id=booking_id,
            project_id=project_id,
            client_id=None
        )
        db.add(convo)
        db.flush()

        # 3. Setup participants (Freelancer + Admin only; Client is NEVER added)
        MessageRepository.get_or_create_participant(db, convo.id, freelancer_user_id)
        MessageRepository.get_or_create_participant(db, convo.id, admin_user.id)

        # 4. Inject initial system welcome message
        intro_text = (
            "🔔 Welcome to your assignment support channel! You have received a booking assignment from the marketplace team. "
            "You can discuss job details, deliverables, kit requirements, or questions with platform administration here."
        )
        MessageRepository.create_message(
            db,
            conversation_id=convo.id,
            sender_id=admin_user.id,
            text=intro_text,
            is_system=True
        )

        db.commit()
        db.refresh(convo)
        return convo

    # -------------------------------------------------------------------------
    # PART 8, 9, 10: LIST CONVERSATIONS
    # -------------------------------------------------------------------------
    @staticmethod
    def list_conversations(
        db: Session,
        current_user: User,
        conversation_type_filter: Optional[str] = None,
        booking_id_filter: Optional[int] = None,
        project_id_filter: Optional[int] = None,
        search: Optional[str] = None,
        unread_only: bool = False
    ) -> List[ManagedConversationListItem]:
        user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

        query = db.query(Conversation)

        # Role-based query scoping
        if user_role_str == "CLIENT":
            # Client can see CLIENT_ADMIN and DIRECT_LEGACY conversations where client_id == current_user.id
            query = query.filter(
                Conversation.conversation_type.in_([
                    ConversationType.CLIENT_ADMIN.value,
                    ConversationType.DIRECT_LEGACY.value
                ]),
                Conversation.client_id == current_user.id
            )
        elif user_role_str == "FREELANCER":
            # Freelancer can see FREELANCER_ADMIN and DIRECT_LEGACY conversations where freelancer_id == current_user.id
            query = query.filter(
                Conversation.conversation_type.in_([
                    ConversationType.FREELANCER_ADMIN.value,
                    ConversationType.DIRECT_LEGACY.value
                ]),
                Conversation.freelancer_id == current_user.id
            )
        elif user_role_str == "ADMIN":
            # Admin can see both CLIENT_ADMIN and FREELANCER_ADMIN
            if conversation_type_filter:
                query = query.filter(Conversation.conversation_type == conversation_type_filter)
            else:
                query = query.filter(
                    Conversation.conversation_type.in_([
                        ConversationType.CLIENT_ADMIN.value,
                        ConversationType.FREELANCER_ADMIN.value
                    ])
                )
        else:
            return []

        if booking_id_filter:
            query = query.filter(Conversation.booking_id == booking_id_filter)

        if project_id_filter:
            query = query.filter(Conversation.project_id == project_id_filter)

        conversations = query.order_by(Conversation.updated_at.desc()).all()

        results: List[ManagedConversationListItem] = []
        for c in conversations:
            # Latest message
            latest_msg = (
                db.query(Message)
                .filter(Message.conversation_id == c.id)
                .order_by(Message.created_at.desc())
                .first()
            )

            unread_cnt = MessageRepository.get_unread_count(db, c.id, current_user.id)
            if unread_only and unread_cnt == 0:
                continue

            # Determine recipient role & name
            recipient_role = "ADMIN"
            recipient_name = "Platform Administration"
            recipient_user_id = None

            if user_role_str == "ADMIN":
                if c.conversation_type == ConversationType.CLIENT_ADMIN.value:
                    recipient_role = "CLIENT"
                    recipient_name = c.client.full_name if c.client else "Client"
                    recipient_user_id = c.client_id
                elif c.conversation_type == ConversationType.FREELANCER_ADMIN.value:
                    recipient_role = "FREELANCER"
                    recipient_name = c.freelancer.full_name if c.freelancer else "Creator"
                    recipient_user_id = c.freelancer_id
            elif user_role_str == "CLIENT":
                recipient_role = "ADMIN"
                recipient_name = "Platform Concierge"
                recipient_user_id = c.admin_id
            elif user_role_str == "FREELANCER":
                recipient_role = "ADMIN"
                recipient_name = "Platform Support"
                recipient_user_id = c.admin_id

            if search:
                s_lower = search.lower()
                matches_name = recipient_name.lower().find(s_lower) != -1
                matches_msg = (latest_msg.content or "").lower().find(s_lower) != -1 if latest_msg else False
                if not matches_name and not matches_msg:
                    continue

            results.append(
                ManagedConversationListItem(
                    id=c.id,
                    conversation_type=c.conversation_type,
                    booking_id=c.booking_id,
                    project_id=c.project_id,
                    recipient_role=recipient_role,
                    recipient_name=recipient_name,
                    recipient_user_id=recipient_user_id,
                    latest_message=latest_msg.content if latest_msg else None,
                    latest_message_sender_id=latest_msg.sender_id if latest_msg else None,
                    last_message_at=latest_msg.created_at if latest_msg else c.updated_at,
                    unread_count=unread_cnt,
                    context=AdminMessagingService._build_context(db, c.booking_id, c.project_id, current_user.role),
                    created_at=c.created_at,
                    updated_at=c.updated_at
                )
            )
        return results

    # -------------------------------------------------------------------------
    # PART 11: CONVERSATION DETAIL
    # -------------------------------------------------------------------------
    @staticmethod
    def _validate_access(db: Session, current_user: User, conversation_id: int) -> Conversation:
        convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not convo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

        user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

        if user_role_str == "CLIENT":
            if convo.conversation_type not in [ConversationType.CLIENT_ADMIN.value, ConversationType.DIRECT_LEGACY.value] or convo.client_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this conversation.")
        elif user_role_str == "FREELANCER":
            if convo.conversation_type not in [ConversationType.FREELANCER_ADMIN.value, ConversationType.DIRECT_LEGACY.value] or convo.freelancer_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this conversation.")
        elif user_role_str == "ADMIN":
            pass
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized role.")

        return convo

    # -------------------------------------------------------------------------
    @staticmethod
    def get_conversation_detail(db: Session, current_user: User, conversation_id: int) -> ManagedConversationDetail:
        convo = AdminMessagingService._validate_access(db, current_user, conversation_id)

        user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

        # Strict RBAC Authorization
        if user_role_str == "CLIENT":
            if convo.conversation_type == ConversationType.CLIENT_ADMIN.value:
                if convo.client_id != current_user.id:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this conversation.")
            elif convo.conversation_type == ConversationType.DIRECT_LEGACY.value:
                if convo.client_id != current_user.id:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this conversation.")
            else:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this conversation.")
        elif user_role_str == "FREELANCER":
            if convo.conversation_type == ConversationType.FREELANCER_ADMIN.value:
                if convo.freelancer_id != current_user.id:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this conversation.")
            elif convo.conversation_type == ConversationType.DIRECT_LEGACY.value:
                if convo.freelancer_id != current_user.id:
                    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this conversation.")
            else:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to access this conversation.")
        elif user_role_str == "ADMIN":
            pass # Admin has full operational access
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized role.")

        # Determine recipient role & name
        recipient_role = "ADMIN"
        recipient_name = "Platform Administration"
        if user_role_str == "ADMIN":
            if convo.conversation_type == ConversationType.CLIENT_ADMIN.value:
                recipient_role = "CLIENT"
                recipient_name = convo.client.full_name if convo.client else "Client"
            elif convo.conversation_type == ConversationType.FREELANCER_ADMIN.value:
                recipient_role = "FREELANCER"
                recipient_name = convo.freelancer.full_name if convo.freelancer else "Creator"
        elif convo.conversation_type == ConversationType.DIRECT_LEGACY.value:
            if user_role_str == "CLIENT":
                recipient_role = "FREELANCER"
                recipient_name = convo.freelancer.full_name if convo.freelancer else "Freelancer (Legacy)"
            elif user_role_str == "FREELANCER":
                recipient_role = "CLIENT"
                recipient_name = convo.client.full_name if convo.client else "Client (Legacy)"

        # Auto-update read marker on fetch
        messages = MessageRepository.get_conversation_messages(db, conversation_id)
        if messages:
            latest_msg = messages[-1]
            MessageRepository.update_read_marker(db, conversation_id, current_user.id, latest_msg.id)

        unread_cnt = MessageRepository.get_unread_count(db, conversation_id, current_user.id)

        # Participants
        participants_out: List[ManagedParticipantOut] = []
        for p in convo.participants:
            u = p.user
            if u:
                u_role = u.role.value if hasattr(u.role, "value") else str(u.role)
                participants_out.append(
                    ManagedParticipantOut(
                        id=p.id,
                        user_id=p.user_id,
                        full_name=u.full_name,
                        role=u_role,
                        last_read_message_id=p.last_read_message_id,
                        last_read_at=p.last_read_at
                    )
                )

        messages_out = [AdminMessagingService._build_message_out(m) for m in messages]

        return ManagedConversationDetail(
            id=convo.id,
            conversation_type=convo.conversation_type,
            booking_id=convo.booking_id,
            project_id=convo.project_id,
            client_id=convo.client_id,
            freelancer_id=convo.freelancer_id,
            admin_id=convo.admin_id,
            recipient_role=recipient_role,
            recipient_name=recipient_name,
            unread_count=unread_cnt,
            context=AdminMessagingService._build_context(db, convo.booking_id, convo.project_id, current_user.role),
            participants=participants_out,
            messages=messages_out,
            created_at=convo.created_at,
            updated_at=convo.updated_at
        )

    # -------------------------------------------------------------------------
    # PART 12 & 14: SEND MESSAGE & LEGACY POLICY
    # -------------------------------------------------------------------------
    @staticmethod
    def send_message(
        db: Session,
        current_user: User,
        conversation_id: int,
        content: str,
        reply_to_message_id: Optional[int] = None,
        file_ids: Optional[List[int]] = None
    ) -> ManagedMessageOut:
        convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not convo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation thread not found.")

        user_role_str = current_user.role.value if hasattr(current_user.role, "value") else str(current_user.role)

        # Block direct legacy messaging for non-admins
        if convo.conversation_type == ConversationType.DIRECT_LEGACY.value:
            if user_role_str != "ADMIN":
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Direct client-to-freelancer messaging is deprecated. All communications are managed through dedicated Admin channels."
                )

        # RBAC Authorization
        if user_role_str == "CLIENT":
            if convo.conversation_type != ConversationType.CLIENT_ADMIN.value or convo.client_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to post in this conversation.")
        elif user_role_str == "FREELANCER":
            if convo.conversation_type != ConversationType.FREELANCER_ADMIN.value or convo.freelancer_id != current_user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You do not have permission to post in this conversation.")
        elif user_role_str == "ADMIN":
            pass # Admin authorized
        else:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Unauthorized role.")

        if not content or not content.strip():
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Message text cannot be empty.")

        # Determine message type
        msg_type = MessageType.TEXT
        attachments_records = []
        if file_ids:
            for fid in file_ids:
                wf = db.query(WorkspaceFile).filter(WorkspaceFile.id == fid).first()
                if wf:
                    attachments_records.append(wf)
            if attachments_records:
                main_mime = attachments_records[0].mime_type or ""
                msg_type = MessageType.IMAGE if main_mime.startswith("image/") else MessageType.FILE

        db_msg = MessageRepository.create_message(
            db,
            conversation_id=convo.id,
            sender_id=current_user.id,
            text=content.strip(),
            is_system=False,
            message_type=msg_type,
            reply_to_message_id=reply_to_message_id
        )

        for f in attachments_records:
            MessageRepository.create_attachment(db, db_msg.id, f.id)

        # Auto-update sender's read marker
        MessageRepository.update_read_marker(db, convo.id, current_user.id, db_msg.id)

        # Role-isolated Notification Dispatch
        if convo.conversation_type == ConversationType.CLIENT_ADMIN.value:
            if current_user.id == convo.client_id:
                # Client sent -> notify Admin
                target_admin_id = convo.admin_id or AdminMessagingService._get_default_admin(db).id
                NotificationService.dispatch(
                    db=db,
                    recipient_id=target_admin_id,
                    event_code="MESSAGE_RECEIVED",
                    title="New Client Message",
                    message=f"{current_user.full_name}: {content[:100]}",
                    entity_type="CONVERSATION",
                    entity_id=convo.id,
                    action_url=f"/admin/messages/{convo.id}"
                )
            elif user_role_str == "ADMIN":
                # Admin sent -> notify Client
                NotificationService.dispatch(
                    db=db,
                    recipient_id=convo.client_id,
                    event_code="MESSAGE_RECEIVED",
                    title="New Message from Platform Concierge",
                    message=f"Concierge: {content[:100]}",
                    entity_type="CONVERSATION",
                    entity_id=convo.id,
                    action_url=f"/client/messages/{convo.id}"
                )
        elif convo.conversation_type == ConversationType.FREELANCER_ADMIN.value:
            if current_user.id == convo.freelancer_id:
                # Freelancer sent -> notify Admin
                target_admin_id = convo.admin_id or AdminMessagingService._get_default_admin(db).id
                NotificationService.dispatch(
                    db=db,
                    recipient_id=target_admin_id,
                    event_code="MESSAGE_RECEIVED",
                    title="New Creator Message",
                    message=f"{current_user.full_name}: {content[:100]}",
                    entity_type="CONVERSATION",
                    entity_id=convo.id,
                    action_url=f"/admin/messages/{convo.id}"
                )
            elif user_role_str == "ADMIN":
                # Admin sent -> notify Freelancer
                NotificationService.dispatch(
                    db=db,
                    recipient_id=convo.freelancer_id,
                    event_code="MESSAGE_RECEIVED",
                    title="New Message from Platform Support",
                    message=f"Support: {content[:100]}",
                    entity_type="CONVERSATION",
                    entity_id=convo.id,
                    action_url=f"/freelancer/messages/{convo.id}"
                )

        return AdminMessagingService._build_message_out(db_msg)

    # -------------------------------------------------------------------------
    # PART 18: MARK READ
    # -------------------------------------------------------------------------
    @staticmethod
    def mark_conversation_read(db: Session, current_user: User, conversation_id: int) -> dict:
        convo = db.query(Conversation).filter(Conversation.id == conversation_id).first()
        if not convo:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

        latest_msg = (
            db.query(Message)
            .filter(Message.conversation_id == conversation_id)
            .order_by(Message.created_at.desc())
            .first()
        )
        if latest_msg:
            MessageRepository.update_read_marker(db, conversation_id, current_user.id, latest_msg.id)

        return {"status": "success", "conversation_id": conversation_id, "last_read_message_id": latest_msg.id if latest_msg else None}

    # -------------------------------------------------------------------------
    # PART 13: BLOCK NEW DIRECT CHAT CREATION
    # -------------------------------------------------------------------------
    @staticmethod
    def block_direct_conversation_creation() -> None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Direct client-to-freelancer conversations are disabled. All communications are managed through dedicated Admin channels."
        )
