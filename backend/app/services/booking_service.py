from datetime import datetime, date, time
from decimal import Decimal
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.booking import Booking, BookingStatus, BookingSourceType
from app.models.user import User, UserRole
from app.models.service import Service, ServiceStatus
from app.models.project import Project, Proposal
from app.models.booking_requirement_answer import BookingRequirementAnswer
from app.models.reschedule import BookingRescheduleRequest, RescheduleRequestStatus
from app.repositories.booking_repository import BookingRepository
from app.repositories.service_repository import ServiceRepository
from app.repositories.freelancer_repository import FreelancerRepository
from app.repositories.message_repository import MessageRepository
from app.repositories.reschedule_repository import RescheduleRepository
from app.services.availability_service import AvailabilityService


class BookingService:
    @staticmethod
    def create_booking(db: Session, client_id: int, booking_data: dict) -> Booking:
        # Enforce that only clients can submit booking requests
        client_user = db.query(User).filter(User.id == client_id).first()
        if not client_user or client_user.role != UserRole.CLIENT:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only CLIENT users can submit booking requests."
            )

        # 1. Determine flow (Service vs Direct Profile Booking)
        service_id = booking_data.get("service_id")
        selected_freelancer_profile_id = booking_data.get("selected_freelancer_profile_id")
        
        service = None
        package = None
        
        if service_id:
            service = ServiceRepository.get_service_by_id(db, service_id)
            if not service or service.status != ServiceStatus.PUBLISHED:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Service listing not found or is currently unavailable."
                )

            # Retrieve and validate the chosen package
            package_id = booking_data.get("service_package_id")
            for p in service.packages:
                if p.id == package_id:
                    package = p
                    break
            
            if not package:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="The chosen package is not available for this service."
                )

            freelancer_profile_id = service.freelancer_profile_id
            if selected_freelancer_profile_id and selected_freelancer_profile_id != freelancer_profile_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Service/package does not belong to the selected freelancer."
                )
            selected_freelancer_profile_id = freelancer_profile_id
        else:
            if not selected_freelancer_profile_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="selected_freelancer_profile_id is required for direct bookings."
                )
            # Direct booking validations
            budget = booking_data.get("budget")
            if budget is None:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Budget is required for direct bookings.")
            try:
                budget_dec = Decimal(str(budget))
                if budget_dec <= 0:
                    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Budget must be greater than zero.")
            except (ValueError, TypeError, ArithmeticError):
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid budget format.")

            req_desc = booking_data.get("requirement_description") or booking_data.get("description")
            if not req_desc or not req_desc.strip():
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Requirement description is required for direct bookings.")

        # 3. Retrieve freelancer profile
        freelancer_profile = FreelancerRepository.get_profile_by_id(db, selected_freelancer_profile_id)
        if not freelancer_profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Freelancer profile not found."
            )

        # 4. Enforce validations
        freelancer_user = freelancer_profile.user
        if not freelancer_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Freelancer user account not found."
            )
        if freelancer_user.role != UserRole.FREELANCER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected user is not a freelancer."
            )
        if not freelancer_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Freelancer account is inactive."
            )
        if not freelancer_profile.is_profile_public:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Freelancer profile is not bookable."
            )
        if freelancer_profile.user_id == client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot book yourself."
            )

        # 5. Extract scheduling date and time objects
        scheduled_date_val = booking_data.get("scheduled_date")
        if not scheduled_date_val and booking_data.get("booking_date"):
            # Fallback wrapper for legacy payloads
            b_dt = booking_data["booking_date"]
            scheduled_date_val = b_dt.date() if isinstance(b_dt, datetime) else datetime.fromisoformat(str(b_dt)).date()

        if not scheduled_date_val:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Scheduled execution date is required."
            )

        # Past date validation
        if isinstance(scheduled_date_val, str):
            scheduled_date_val = date.fromisoformat(scheduled_date_val)
        if scheduled_date_val < date.today():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot book appointments in the past."
            )

        # 6. Duplicate Booking Protection (last 30 seconds check)
        from datetime import timedelta
        time_limit = datetime.now() - timedelta(seconds=30)
        recent_booking = db.query(Booking).filter(
            Booking.client_id == client_id,
            Booking.selected_freelancer_profile_id == selected_freelancer_profile_id,
            Booking.scheduled_date == scheduled_date_val
        ).order_by(Booking.created_at.desc()).first()
        
        if recent_booking:
            created_at_naive = recent_booking.created_at.replace(tzinfo=None) if recent_booking.created_at.tzinfo else recent_booking.created_at
            if (datetime.now() - created_at_naive).total_seconds() < 30:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="A similar booking request was recently submitted. Please wait a moment before trying again."
                )

        start_t = None
        if booking_data.get("start_time"):
            start_t = datetime.strptime(booking_data["start_time"], "%H:%M").time() if isinstance(booking_data["start_time"], str) else booking_data["start_time"]
        else:
            start_t = time(9, 0) # default fallback

        end_t = None
        if booking_data.get("end_time"):
            end_t = datetime.strptime(booking_data["end_time"], "%H:%M").time() if isinstance(booking_data["end_time"], str) else booking_data["end_time"]
        else:
            end_t = time(18, 0) # default fallback

        # 7. For ON_SITE/HYBRID bookings, check schedule conflicts
        booking_type_val = service.service_type.value if service and hasattr(service.service_type, "value") else str(service.service_type) if service else booking_data.get("booking_type", "REMOTE")
        if booking_type_val in ["ON_SITE", "HYBRID"]:
            availability = AvailabilityService.check_availability(
                db, freelancer_profile.id, scheduled_date_val, start_t, end_t
            )
            if not availability["available"]:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Freelancer scheduling conflict: {availability['reason']}"
                )

        # 8. Validate service requirements answers (if service booking)
        requirements_answers = booking_data.get("requirements_answers") or {}
        if service:
            for req in service.requirements:
                if req.is_required:
                    answer = requirements_answers.get(str(req.id)) or requirements_answers.get(req.question)
                    if answer is None or str(answer).strip() == "":
                        raise HTTPException(
                            status_code=status.HTTP_400_BAD_REQUEST,
                            detail=f"Requirement question '{req.question}' is required."
                        )

        # 9. Generate Unique booking number sequence
        b_number = BookingRepository.generate_booking_number(db)

        # 10. Prepare booking record data
        agreed_amt = package.price if service else Decimal(str(booking_data.get("budget")))
        booking_record = {
            "booking_number": b_number,
            "client_id": client_id,
            "selected_freelancer_profile_id": freelancer_profile.id,
            "freelancer_profile_id": None,
            "is_admin_managed": True,
            "source_type": BookingSourceType.SERVICE,
            "service_id": service.id if service else None,
            "service_package_id": package.id if package else None,
            "title": service.title if service else f"Direct Booking with {freelancer_user.full_name}",
            "description": service.short_description if service else (booking_data.get("requirement_description") or booking_data.get("description")),
            "booking_type": booking_type_val,
            "status": BookingStatus.REQUESTED,
            "scheduled_date": scheduled_date_val,
            "booking_date": datetime.combine(scheduled_date_val, start_t), # Legacy backward compatibility field
            "start_time": start_t,
            "end_time": end_t,
            "timezone": "Asia/Kolkata",
            "location_city": booking_data.get("location_city"),
            "location_state": booking_data.get("location_state"),
            "location_country": booking_data.get("location_country", "India"),
            "venue_name": booking_data.get("venue_name"),
            "venue_address": booking_data.get("venue_address"),
            "agreed_amount": agreed_amt,
            "price": agreed_amt,
            "deposit_amount": Decimal(str(agreed_amt)) * Decimal("0.30"),
            "deposit_paid_amount": Decimal("0.00"),
            "remaining_balance": Decimal(str(agreed_amt)),
            "total_paid": Decimal("0.00"),
            "payment_completion_state": "UNPAID",
            "notes": booking_data.get("notes"),
            "requirements_answers": requirements_answers
        }

        # 11. Persist booking
        new_booking = BookingRepository.create(db, booking_record)

        # 12. Structured answers persistence (only if service exists)
        if service:
            for req in service.requirements:
                ans_val = requirements_answers.get(str(req.id))
                if ans_val is not None:
                    ans_record = BookingRequirementAnswer(
                        booking_id=new_booking.id,
                        service_requirement_id=req.id,
                        answer_text=str(ans_val)
                    )
                    db.add(ans_record)
        db.commit()

        # 13. Spin up CLIENT_ADMIN conversation thread (No direct Client-Freelancer chat!)
        from app.services.admin_messaging_service import AdminMessagingService
        conversation = AdminMessagingService.get_or_create_client_admin_conversation(
            db,
            client_id=client_id,
            booking_id=new_booking.id
        )

        # 14. Record Audit Log
        try:
            from app.services.audit_service import AuditService
            AuditService.log_action(
                db=db,
                admin_user_id=client_id,
                action="MANAGED_BOOKING_CREATED",
                entity_type="BOOKING",
                entity_id=new_booking.id,
                description=f"Managed booking request {new_booking.booking_number} created by client.",
                metadata_json={
                    "booking_id": new_booking.id,
                    "client_id": client_id,
                    "selected_freelancer_profile_id": selected_freelancer_profile_id,
                    "source": "SERVICE" if service_id else "PROFILE"
                }
            )
        except Exception:
            import logging
            logging.getLogger("booking_service").exception("Booking audit logging failed")

        # 15. Trigger notification to Admin & Client
        try:
            from app.services.notification_service import NotificationService
            client_name = client_user.full_name if client_user else "Client"
            
            # Notify Client
            NotificationService.dispatch(
                db=db,
                recipient_id=client_id,
                event_code="BOOKING_REQUESTED",
                title="Booking Request Received",
                message=f"We have received your booking request '{new_booking.title}' for {scheduled_date_val.strftime('%Y-%m-%d')}. Our curation team will review and coordinate creator assignment.",
                action_url=f"/client/bookings/{new_booking.id}",
                entity_type="booking",
                entity_id=new_booking.id
            )
            
            # Notify Admin
            admin_user = AdminMessagingService._get_default_admin(db)
            NotificationService.dispatch(
                db=db,
                recipient_id=admin_user.id,
                event_code="BOOKING_REQUESTED",
                title="New Managed Booking Request",
                message=f"{client_name} submitted a new booking request '{new_booking.title}'. Review and assign creator.",
                action_url=f"/admin/bookings/{new_booking.id}",
                entity_type="booking",
                entity_id=new_booking.id
            )
        except Exception:
            import logging
            logging.getLogger("booking_service").exception("Booking notification failed")

        return new_booking

    @staticmethod
    def accept_proposal(db: Session, client_id: int, proposal_id: int, scheduled_date_val: date, start_time_str: str, end_time_str: str, venue_name: Optional[str] = None, venue_address: Optional[str] = None, city: Optional[str] = None, state: Optional[str] = None) -> Booking:
        # Retrieve proposal
        proposal = db.query(Proposal).filter(Proposal.id == proposal_id).first()
        if not proposal:
            raise HTTPException(status_code=404, detail="Proposal not found")
        
        project = db.query(Project).filter(Project.id == proposal.project_id).first()
        if not project or project.client_id != client_id:
            raise HTTPException(status_code=403, detail="Unauthorized action for this project")
        
        if project.status == "AWARDED" or proposal.status == "ACCEPTED":
            raise HTTPException(status_code=400, detail="This proposal/project has already been awarded.")

        # Retrieve freelancer profile and prevent self-booking
        freelancer_profile = FreelancerRepository.get_profile_by_id(db, proposal.freelancer_profile_id)
        if not freelancer_profile:
            raise HTTPException(status_code=404, detail="Freelancer profile not found")
        if freelancer_profile.user_id == client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="You cannot award a project proposal to yourself."
            )

        # Check conflict availability check
        start_t = datetime.strptime(start_time_str, "%H:%M").time()
        end_t = datetime.strptime(end_time_str, "%H:%M").time()
        
        if project.project_type in ["ON_SITE", "HYBRID"]:
            availability = AvailabilityService.check_availability(
                db, proposal.freelancer_profile_id, scheduled_date_val, start_t, end_t
            )
            if not availability["available"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Freelancer availability conflict: {availability['reason']}"
                )

        # Update Project & Proposal status
        project.status = "AWARDED"
        proposal.status = "ACCEPTED"
        
        # Reject other pending proposals
        db.query(Proposal).filter(
            Proposal.project_id == project.id,
            Proposal.id != proposal.id,
            Proposal.status == "PENDING"
        ).update({"status": "REJECTED"}, synchronize_session=False)
        
        b_number = BookingRepository.generate_booking_number(db)
        
        booking_record = {
            "booking_number": b_number,
            "client_id": client_id,
            "freelancer_profile_id": proposal.freelancer_profile_id,
            "source_type": BookingSourceType.PROJECT,
            "project_id": project.id,
            "proposal_id": proposal.id,
            "title": project.title,
            "description": project.description,
            "booking_type": project.project_type,
            "status": BookingStatus.PENDING_CONFIRMATION, # Confirmed requires freelancer acceptance
            "scheduled_date": scheduled_date_val,
            "booking_date": datetime.combine(scheduled_date_val, start_t),
            "start_time": start_t,
            "end_time": end_t,
            "timezone": "Asia/Kolkata",
            "location_city": city or project.city,
            "location_state": state or project.state,
            "location_country": project.country or "India",
            "venue_name": venue_name,
            "venue_address": venue_address,
            "agreed_amount": proposal.proposed_amount,
            "price": proposal.proposed_amount,
            "deposit_amount": Decimal(str(proposal.proposed_amount)) * Decimal("0.30"),
            "deposit_paid_amount": Decimal("0.00"),
            "remaining_balance": Decimal(str(proposal.proposed_amount)),
            "total_paid": Decimal("0.00"),
            "payment_completion_state": "UNPAID",
            "confirmed_at": datetime.now(),
            "notes": f"Proposal Cover Letter: {proposal.cover_letter}"
        }
        
        new_booking = BookingRepository.create(db, booking_record)
        
        # System messaging notice
        freelancer_profile = FreelancerRepository.get_profile_by_id(db, proposal.freelancer_profile_id)
        conversation = MessageRepository.get_or_create_conversation(
            db,
            client_id=client_id,
            freelancer_id=freelancer_profile.user_id
        )

        intro_text = (
            f"🔔 System Notice: Proposal has been ACCEPTED. Booking generated automatically.\n\n"
            f"Booking ID: {new_booking.booking_number}\n"
            f"Project Title: {project.title}\n"
            f"Agreed Amount: ₹{new_booking.agreed_amount:.2f}\n"
            f"Scheduled Date: {scheduled_date_val.strftime('%Y-%m-%d')} ({start_time_str} - {end_time_str})\n\n"
            f"Fulfillment state: CONFIRMED."
        )
        MessageRepository.create_message(
            db,
            conversation_id=conversation.id,
            sender_id=client_id,
            text=intro_text,
            is_system=True
        )
        
        db.commit()

        # Auto-create initial BookingAssignment so freelancer can accept it
        try:
            from app.models.booking_assignment import BookingAssignment, AssignmentStatus, ClientApprovalStatus
            from app.services.admin_messaging_service import AdminMessagingService
            admin_user = AdminMessagingService._get_default_admin(db)
            assignment = BookingAssignment(
                booking_id=new_booking.id,
                freelancer_profile_id=proposal.freelancer_profile_id,
                assigned_by_admin_id=admin_user.id,
                assignment_round=1,
                status=AssignmentStatus.OFFERED.value,
                offered_payout_amount=new_booking.agreed_amount * Decimal("0.75"),
                is_replacement=False,
                client_approval_required=False,
                client_approval_status=ClientApprovalStatus.NOT_REQUIRED.value,
                offered_at=datetime.utcnow()
            )
            db.add(assignment)
            db.commit()
        except Exception:
            import logging
            logging.getLogger("booking_service").exception("Failed to auto-create booking assignment for accepted proposal")

        # Trigger notification
        try:
            from app.services.notification_service import NotificationService
            NotificationService.dispatch(
                db=db,
                recipient_id=freelancer_profile.user_id,
                event_code="PROPOSAL_ACCEPTED",
                title="Proposal Accepted",
                message=f"Your proposal for project '{project.title}' has been accepted.",
                action_url=f"/freelancer/bookings/{new_booking.id}",
                entity_type="booking",
                entity_id=new_booking.id,
                payload_meta={
                    "project_title": project.title,
                    "budget": str(proposal.proposed_amount),
                    "booking_id": new_booking.id
                }
            )
        except Exception as e:
            import logging
            logging.getLogger("booking_service").exception("Proposal accept notification failed")

        from app.models.user import UserRole
        BookingService._attach_dynamic_fields(db, new_booking, UserRole.CLIENT)
        return new_booking

    @staticmethod
    def _attach_dynamic_fields(db: Session, booking: Booking, user_role: UserRole):
        # 1. Fetch CLIENT_ADMIN conversation_id
        from app.models.message import Conversation, ConversationType
        convo = db.query(Conversation).filter(
            Conversation.booking_id == booking.id,
            Conversation.conversation_type == ConversationType.CLIENT_ADMIN.value
        ).first()
        booking.conversation_id = convo.id if convo else None

        # 2. Fetch latest assignment info
        from app.models.booking_assignment import BookingAssignment
        latest_assign = db.query(BookingAssignment).filter(
            BookingAssignment.booking_id == booking.id
        ).order_by(BookingAssignment.assignment_round.desc()).first()
        if latest_assign:
            booking.latest_assignment_status = latest_assign.status.value if hasattr(latest_assign.status, "value") else str(latest_assign.status)
            booking.client_approval_status = latest_assign.client_approval_status.value if hasattr(latest_assign.client_approval_status, "value") else str(latest_assign.client_approval_status)
            booking.client_approval_required = latest_assign.client_approval_required
            booking.latest_assignment_id = latest_assign.id
            
            # Fetch proposed freelancer profile summary
            from app.repositories.freelancer_repository import FreelancerRepository
            p_profile = FreelancerRepository.get_profile_by_id(db, latest_assign.freelancer_profile_id)
            booking.proposed_freelancer = p_profile
        else:
            booking.latest_assignment_status = None
            booking.client_approval_status = None
            booking.client_approval_required = None
            booking.latest_assignment_id = None
            booking.proposed_freelancer = None

    @staticmethod
    def get_booking_by_id(db: Session, user: User, booking_id: int) -> Booking:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found."
            )

        # Dynamic auto-completion check: if dispute window has expired, set status to COMPLETED
        if booking.final_approved_at and booking.dispute_window_ends_at and booking.status != BookingStatus.COMPLETED:
            if datetime.now() > booking.dispute_window_ends_at:
                # Check for active disputes
                from app.models.dispute import Dispute, DisputeStatus
                active_dispute = db.query(Dispute).filter(
                    Dispute.booking_id == booking.id,
                    Dispute.status.in_([DisputeStatus.OPEN, DisputeStatus.UNDER_REVIEW, DisputeStatus.WAITING_FOR_CLIENT, DisputeStatus.WAITING_FOR_FREELANCER])
                ).first()
                if not active_dispute:
                    booking.status = BookingStatus.COMPLETED
                    booking.completed_at = booking.dispute_window_ends_at
                    db.commit()
                    db.refresh(booking)

        # Authorization check: must be the booking client OR the freelancer owner
        is_client = (booking.client_id == user.id)
        is_freelancer = False
        freelancer_profile = FreelancerRepository.get_profile_by_id(db, booking.freelancer_profile_id)
        if freelancer_profile and freelancer_profile.user_id == user.id:
            is_freelancer = True

        if not is_client and not is_freelancer and user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied for this booking."
            )

        BookingService._attach_dynamic_fields(db, booking, user.role)
        return booking

    @staticmethod
    def list_bookings(db: Session, user: User) -> list[Booking]:
        if user.role == UserRole.FREELANCER:
            profile = FreelancerRepository.get_profile_by_user_id(db, user.id)
            if not profile:
                return []
            bookings = BookingRepository.get_freelancer_bookings(db, profile.id)
        else:
            bookings = BookingRepository.get_client_bookings(db, user.id)

        for b in bookings:
            BookingService._attach_dynamic_fields(db, b, user.role)
        return bookings

    @staticmethod
    def update_booking_status(db: Session, user: User, booking_id: int, new_status: BookingStatus, cancellation_reason: Optional[str] = None) -> Booking:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found."
            )

        # Fetch roles & verify permissions
        is_client = (booking.client_id == user.id)
        is_freelancer = False
        freelancer_profile = FreelancerRepository.get_profile_by_id(db, booking.freelancer_profile_id)
        if freelancer_profile and freelancer_profile.user_id == user.id:
            is_freelancer = True

        if not is_client and not is_freelancer and user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to modify this booking."
            )

        current = booking.status

        # Strict State Machine Enforcement
        ALLOWED_TRANSITIONS = {
            BookingStatus.REQUESTED: [BookingStatus.PENDING_CONFIRMATION, BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.REJECTED],
            BookingStatus.PENDING_CONFIRMATION: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED, BookingStatus.REJECTED],
            BookingStatus.CONFIRMED: [BookingStatus.IN_PROGRESS, BookingStatus.RESCHEDULE_REQUESTED, BookingStatus.CANCELLED],
            BookingStatus.RESCHEDULE_REQUESTED: [BookingStatus.CONFIRMED, BookingStatus.CANCELLED],
            BookingStatus.IN_PROGRESS: [BookingStatus.DELIVERY_PENDING, BookingStatus.CANCELLED, BookingStatus.RESCHEDULE_REQUESTED],
            BookingStatus.DELIVERY_PENDING: [BookingStatus.COMPLETED, BookingStatus.CANCELLED],
            BookingStatus.COMPLETED: [],  # Terminal state
            BookingStatus.CANCELLED: [],  # Terminal state
            BookingStatus.REJECTED: [],   # Terminal state
        }

        # Check if transition is allowed
        allowed_next_states = ALLOWED_TRANSITIONS.get(current, [])
        if new_status not in allowed_next_states and user.role != UserRole.ADMIN:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid state transition from {current.value} to {new_status.value}."
            )

        # Transition security rules
        if new_status == BookingStatus.CONFIRMED:
            if not is_freelancer and user.role != UserRole.ADMIN:
                raise HTTPException(status_code=403, detail="Only freelancers can confirm a requested booking.")
            if current != BookingStatus.REQUESTED:
                raise HTTPException(status_code=400, detail="Only REQUESTED bookings can be confirmed.")
            # Check availability overrides one more time on confirm for physical jobs
            if booking.booking_type in ["ON_SITE", "HYBRID"]:
                availability = AvailabilityService.check_availability(
                    db, booking.freelancer_profile_id, booking.scheduled_date, booking.start_time, booking.end_time, exclude_booking_id=booking.id
                )
                if not availability["available"]:
                    raise HTTPException(status_code=400, detail=f"Cannot confirm: Freelancer is unavailable. Reason: {availability['reason']}")
            booking.confirmed_at = datetime.now()

        elif new_status == BookingStatus.REJECTED:
            if not is_freelancer and user.role != UserRole.ADMIN:
                raise HTTPException(status_code=403, detail="Only freelancers can reject requested bookings.")
            if current != BookingStatus.REQUESTED:
                raise HTTPException(status_code=400, detail="Only REQUESTED bookings can be rejected.")

        elif new_status == BookingStatus.IN_PROGRESS:
            if not is_freelancer and user.role != UserRole.ADMIN:
                raise HTTPException(status_code=403, detail="Only freelancers can start confirmed bookings.")
            if current != BookingStatus.CONFIRMED:
                raise HTTPException(status_code=400, detail="Only CONFIRMED bookings can be started.")
            
            # Enforce client payment before work start
            if booking.agreed_amount > 0:
                from app.repositories.payment_repository import PaymentRepository
                pay_rec = PaymentRepository.get_by_booking_id(db, booking.id)
                if not pay_rec or pay_rec.status != "CAPTURED":
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail="Payment must be completed before this booking can start."
                    )
            booking.started_at = datetime.now()

            # Automatically initialize workspace if needed and log timeline event
            try:
                from app.services.workspace_service import WorkspaceService
                from app.models.workspace_event import WorkspaceEventType
                workspace = WorkspaceService.get_or_create_workspace(db, user, booking.id)
                WorkspaceService.log_workspace_event(
                    db,
                    workspace_id=workspace.id,
                    event_type=WorkspaceEventType.WORK_STARTED,
                    actor_user_id=user.id,
                    title="Project Started",
                    description=f"{user.full_name} has started working on this project. Workspace is now active."
                )
            except Exception:
                pass

        elif new_status == BookingStatus.DELIVERY_PENDING:
            if not is_freelancer and user.role != UserRole.ADMIN:
                raise HTTPException(status_code=403, detail="Only freelancers can mark delivery pending.")
            if current != BookingStatus.IN_PROGRESS:
                raise HTTPException(status_code=400, detail="Booking must be IN_PROGRESS to deliver.")

        elif new_status == BookingStatus.COMPLETED:
            if not is_client and user.role != UserRole.ADMIN:
                raise HTTPException(status_code=403, detail="Only clients can complete bookings.")
            if current != BookingStatus.DELIVERY_PENDING:
                raise HTTPException(status_code=400, detail="Only DELIVERY_PENDING bookings can be completed.")
            booking.completed_at = datetime.now()

            # Log project completion event to timeline
            try:
                from app.repositories.workspace_repository import WorkspaceRepository
                from app.services.workspace_service import WorkspaceService
                from app.models.workspace_event import WorkspaceEventType
                workspace = WorkspaceRepository.get_by_booking_id(db, booking.id)
                if workspace:
                    WorkspaceService.log_workspace_event(
                        db,
                        workspace_id=workspace.id,
                        event_type=WorkspaceEventType.BOOKING_COMPLETED,
                        actor_user_id=user.id,
                        title="Project Completed",
                        description=f"{user.full_name} approved the final delivery and marked the project as completed."
                    )
            except Exception:
                pass

        elif new_status == BookingStatus.CANCELLED:
            if current not in [BookingStatus.REQUESTED, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]:
                raise HTTPException(status_code=400, detail="Booking cannot be cancelled in this status.")
            booking.cancellation_reason = cancellation_reason
            booking.cancelled_by = user.role.value if hasattr(user.role, "value") else str(user.role)
            booking.cancelled_at = datetime.now()

        # Update and notify
        updated_booking = BookingRepository.update_status(db, booking, new_status)

        conversation = MessageRepository.get_or_create_conversation(
            db,
            client_id=booking.client_id,
            freelancer_id=freelancer_profile.user_id
        )

        status_txt = (
            f"📢 System Notice: Booking status has been updated to **{new_status.value}** by "
            f"{'Freelancer' if is_freelancer else 'Client'}."
        )
        if cancellation_reason:
            status_txt += f"\nReason: {cancellation_reason}"

        MessageRepository.create_message(
            db,
            conversation_id=conversation.id,
            sender_id=user.id,
            text=status_txt,
            is_system=True
        )

        # Trigger status change notification
        try:
            from app.services.notification_service import NotificationService
            freelancer_id = freelancer_profile.user_id
            
            # Map status change events
            event_code = None
            title = None
            msg_body = None
            recipient_id = None
            action_url = None
            meta = {
                "booking_id": updated_booking.id,
                "booking_number": updated_booking.booking_number,
                "freelancer_name": freelancer_profile.user.full_name if freelancer_profile and freelancer_profile.user else "Freelancer",
                "scheduled_date": updated_booking.scheduled_date.strftime('%Y-%m-%d')
            }
            
            if new_status == BookingStatus.CONFIRMED:
                event_code = "BOOKING_CONFIRMED"
                title = "Booking Confirmed"
                recipient_id = updated_booking.client_id
                action_url = f"/client/bookings/{updated_booking.id}"
                msg_body = f"{meta['freelancer_name']} accepted your booking request."
            elif new_status == BookingStatus.REJECTED:
                event_code = "BOOKING_REJECTED"
                title = "Booking Request Update"
                recipient_id = updated_booking.client_id
                action_url = f"/client/bookings"
                msg_body = f"Your booking request was declined by the provider."
            elif new_status == BookingStatus.IN_PROGRESS:
                event_code = "BOOKING_STARTED"
                title = "Your Booking has Started"
                recipient_id = updated_booking.client_id
                action_url = f"/client/bookings/{updated_booking.id}/workspace"
                msg_body = f"Your booking '{updated_booking.booking_number}' has been started by the provider."
                meta["role"] = "client"
            elif new_status == BookingStatus.COMPLETED:
                event_code = "BOOKING_COMPLETED"
                title = "Booking Completed Successfully"
                recipient_id = freelancer_id
                action_url = f"/freelancer/bookings/{updated_booking.id}"
                msg_body = f"The client marked booking '{updated_booking.booking_number}' as completed."
                meta["role"] = "freelancer"
            elif new_status == BookingStatus.CANCELLED:
                event_code = "BOOKING_CANCELLED"
                title = "Booking Cancellation Notice"
                # Notify the OTHER party
                recipient_id = freelancer_id if is_client else updated_booking.client_id
                action_url = f"/client/bookings/{updated_booking.id}" if recipient_id == updated_booking.client_id else f"/freelancer/bookings/{updated_booking.id}"
                msg_body = f"Booking '{updated_booking.booking_number}' was cancelled."
                meta["cancelled_by"] = "Client" if is_client else "Freelancer"
                meta["reason"] = cancellation_reason or "Not provided"
                meta["role"] = "client" if recipient_id == updated_booking.client_id else "freelancer"

            if event_code:
                NotificationService.dispatch(
                    db=db,
                    recipient_id=recipient_id,
                    event_code=event_code,
                    title=title,
                    message=msg_body,
                    action_url=action_url,
                    entity_type="booking",
                    entity_id=updated_booking.id,
                    payload_meta=meta
                )
        except Exception as e:
            import logging
            logging.getLogger("booking_service").exception("Booking status change notification failed")

        BookingService._attach_dynamic_fields(db, updated_booking, user.role)
        return updated_booking

    @staticmethod
    def request_reschedule(db: Session, user: User, booking_id: int, new_date: date, new_start_time: time, new_end_time: time, reason: Optional[str] = None) -> BookingRescheduleRequest:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        # Must be client or freelancer on booking
        is_client = (booking.client_id == user.id)
        is_freelancer = False
        freelancer_profile = FreelancerRepository.get_profile_by_id(db, booking.freelancer_profile_id)
        if freelancer_profile and freelancer_profile.user_id == user.id:
            is_freelancer = True

        if not is_client and not is_freelancer:
            raise HTTPException(status_code=403, detail="Unauthorized action")

        # Allowed only in REQUESTED, CONFIRMED, IN_PROGRESS states
        if booking.status not in [BookingStatus.REQUESTED, BookingStatus.CONFIRMED, BookingStatus.IN_PROGRESS]:
            raise HTTPException(status_code=400, detail="Booking cannot be rescheduled in its current state")

        # Check reschedule limits: new date in future
        if new_date < date.today():
            raise HTTPException(status_code=400, detail="Cannot reschedule to a past date")

        # Cancel any pending reschedule requests
        existing_pending = RescheduleRepository.get_pending_request_for_booking(db, booking.id)
        if existing_pending:
            RescheduleRepository.update_status(db, existing_pending, RescheduleRequestStatus.CANCELLED)

        # Create reschedule record
        req_by = "CLIENT" if is_client else "FREELANCER"
        resched_data = {
            "booking_id": booking.id,
            "requested_by": req_by,
            "old_date": booking.scheduled_date,
            "old_start_time": booking.start_time,
            "old_end_time": booking.end_time,
            "new_date": new_date,
            "new_start_time": new_start_time,
            "new_end_time": new_end_time,
            "reason": reason,
            "status": RescheduleRequestStatus.PENDING
        }
        resched_req = RescheduleRepository.create_request(db, resched_data)

        # Update booking status
        booking.status = BookingStatus.RESCHEDULE_REQUESTED
        db.commit()

        # Send system notice
        conversation = MessageRepository.get_or_create_conversation(
            db,
            client_id=booking.client_id,
            freelancer_id=freelancer_profile.user_id
        )
        msg_text = (
            f"🔄 Reschedule Request: {req_by} has proposed a new date/time.\n"
            f"Proposed Date: {new_date.strftime('%Y-%m-%d')} ({new_start_time.strftime('%H:%M')} - {new_end_time.strftime('%H:%M')})\n"
            f"Reason: {reason or 'Not provided'}\n\n"
            f"Please respond with accept or reject on the booking details dashboard."
        )
        MessageRepository.create_message(
            db,
            conversation_id=conversation.id,
            sender_id=user.id,
            text=msg_text,
            is_system=True
        )

        # Trigger reschedule requested notification
        try:
            from app.services.notification_service import NotificationService
            recipient_id = booking.client_id if is_freelancer else freelancer_profile.user_id
            NotificationService.dispatch(
                db=db,
                recipient_id=recipient_id,
                event_code="BOOKING_RESCHEDULE_REQUESTED",
                title="Reschedule Requested for Booking",
                message=f"{'Freelancer' if is_freelancer else 'Client'} proposed a reschedule for booking '{booking.booking_number}'.",
                action_url=f"/client/bookings/{booking.id}" if recipient_id == booking.client_id else f"/freelancer/bookings/{booking.id}",
                entity_type="reschedule_request",
                entity_id=resched_req.id,
                payload_meta={
                    "booking_id": booking.id,
                    "booking_number": booking.booking_number,
                    "proposed_date": new_date.strftime('%Y-%m-%d'),
                    "proposed_time": new_start_time.strftime('%H:%M'),
                    "reason": reason or "",
                    "role": "client" if recipient_id == booking.client_id else "freelancer"
                }
            )
        except Exception as e:
            import logging
            logging.getLogger("booking_service").exception("Reschedule request notification failed")

        return resched_req

    @staticmethod
    def respond_reschedule(db: Session, user: User, booking_id: int, request_id: int, accept: bool) -> Booking:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")

        resched_req = RescheduleRepository.get_by_id(db, request_id)
        if not resched_req or resched_req.booking_id != booking.id or resched_req.status != RescheduleRequestStatus.PENDING:
            raise HTTPException(status_code=404, detail="Pending reschedule request not found")

        # Recipient check: the user responding must be the OTHER party than who requested it
        is_client = (booking.client_id == user.id)
        is_freelancer = False
        freelancer_profile = FreelancerRepository.get_profile_by_id(db, booking.freelancer_profile_id)
        if freelancer_profile and freelancer_profile.user_id == user.id:
            is_freelancer = True

        if not is_client and not is_freelancer:
            raise HTTPException(status_code=403, detail="Access denied")

        actor_role = "CLIENT" if is_client else "FREELANCER"
        if resched_req.requested_by == actor_role:
            raise HTTPException(status_code=400, detail="You cannot respond to your own reschedule request")

        if accept:
            # Verify freelancer availability for new requested window
            availability = AvailabilityService.check_availability(
                db,
                booking.freelancer_profile_id,
                resched_req.new_date,
                resched_req.new_start_time,
                resched_req.new_end_time,
                exclude_booking_id=booking.id
            )
            if not availability["available"]:
                raise HTTPException(
                    status_code=400,
                    detail=f"Cannot accept reschedule: Freelancer is unavailable. Reason: {availability['reason']}"
                )

            # Update schedule coordinates
            booking.scheduled_date = resched_req.new_date
            booking.booking_date = datetime.combine(resched_req.new_date, resched_req.new_start_time)
            booking.start_time = resched_req.new_start_time
            booking.end_time = resched_req.new_end_time
            
            # Restore booking status (default to CONFIRMED or legacy)
            booking.status = BookingStatus.CONFIRMED
            resched_req.status = RescheduleRequestStatus.ACCEPTED
        else:
            # Restore previous status
            booking.status = BookingStatus.CONFIRMED
            resched_req.status = RescheduleRequestStatus.REJECTED

        resched_req.responded_at = datetime.now()
        db.commit()

        # Notify system notice
        conversation = MessageRepository.get_or_create_conversation(
            db,
            client_id=booking.client_id,
            freelancer_id=freelancer_profile.user_id
        )
        msg_text = (
            f"📢 System Notice: Reschedule request has been **{resched_req.status.value}** by "
            f"{'Client' if is_client else 'Freelancer'}."
        )
        MessageRepository.create_message(
            db,
            conversation_id=conversation.id,
            sender_id=user.id,
            text=msg_text,
            is_system=True
        )

        # Trigger reschedule response notification
        try:
            from app.services.notification_service import NotificationService
            recipient_id = booking.client_id if is_freelancer else freelancer_profile.user_id
            event_code = "BOOKING_RESCHEDULE_ACCEPTED" if accept else "BOOKING_RESCHEDULE_REJECTED"
            title = "Reschedule Request Approved" if accept else "Reschedule Request Declined"
            msg_body = f"Reschedule request for booking '{booking.booking_number}' was {'accepted' if accept else 'declined'} by the other party."
            
            NotificationService.dispatch(
                db=db,
                recipient_id=recipient_id,
                event_code=event_code,
                title=title,
                message=msg_body,
                action_url=f"/client/bookings/{booking.id}" if recipient_id == booking.client_id else f"/freelancer/bookings/{booking.id}",
                entity_type="booking",
                entity_id=booking.id,
                payload_meta={
                    "booking_id": booking.id,
                    "booking_number": booking.booking_number,
                    "proposed_date": resched_req.new_date.strftime('%Y-%m-%d'),
                    "role": "client" if recipient_id == booking.client_id else "freelancer"
                }
            )
        except Exception as e:
            import logging
            logging.getLogger("booking_service").exception("Reschedule response notification failed")

        return booking

    @staticmethod
    def send_quote(db: Session, user: User, booking_id: int, proposed_amount: Decimal, deposit_amount: Decimal) -> Booking:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found.")

        # Auth check: must be the freelancer
        freelancer_profile = FreelancerRepository.get_profile_by_id(db, booking.freelancer_profile_id)
        if not freelancer_profile or freelancer_profile.user_id != user.id:
            raise HTTPException(status_code=403, detail="Only the assigned freelancer can send a quotation.")

        if booking.status != BookingStatus.REQUESTED:
            raise HTTPException(status_code=400, detail="Quotations can only be sent for bookings in REQUESTED status.")

        if proposed_amount <= 0:
            raise HTTPException(status_code=400, detail="Proposed amount must be greater than zero.")
        if deposit_amount < 0 or deposit_amount > proposed_amount:
            raise HTTPException(status_code=400, detail="Deposit amount must be between 0 and the total proposed amount.")

        # Update financials
        booking.agreed_amount = proposed_amount
        booking.price = proposed_amount
        booking.deposit_amount = deposit_amount
        booking.remaining_balance = proposed_amount
        booking.status = BookingStatus.PENDING_CONFIRMATION
        db.commit()
        db.refresh(booking)

        # Notify client
        try:
            from app.services.notification_service import NotificationService
            NotificationService.dispatch(
                db=db,
                recipient_id=booking.client_id,
                event_code="QUOTE_RECEIVED",
                title="New Quote Received",
                message=f"You received a new quote of ₹{proposed_amount:,} (Deposit: ₹{deposit_amount:,}) for your booking request.",
                action_url=f"/client/bookings/{booking.id}",
                entity_type="booking",
                entity_id=booking.id
            )
        except Exception:
            pass

        return booking

    @staticmethod
    def accept_quote(db: Session, user: User, booking_id: int) -> Booking:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking or booking.client_id != user.id:
            raise HTTPException(status_code=403, detail="Unauthorized action.")

        if booking.status != BookingStatus.PENDING_CONFIRMATION:
            raise HTTPException(status_code=400, detail="Booking is not in a quote review state.")

        # Transition quote to accepted
        booking.status = BookingStatus.CONFIRMED
        booking.payment_completion_state = "UNPAID"
        db.commit()
        db.refresh(booking)

        # Notify freelancer
        try:
            from app.services.notification_service import NotificationService
            freelancer_profile = FreelancerRepository.get_profile_by_id(db, booking.freelancer_profile_id)
            NotificationService.dispatch(
                db=db,
                recipient_id=freelancer_profile.user_id,
                event_code="QUOTE_ACCEPTED",
                title="Quote Accepted",
                message=f"The client accepted your quote for booking '{booking.booking_number}'. Deposit payment is pending.",
                action_url=f"/freelancer/bookings/{booking.id}",
                entity_type="booking",
                entity_id=booking.id
            )
        except Exception:
            pass

        return booking

    @staticmethod
    def approve_preview(db: Session, user: User, booking_id: int) -> Booking:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking or booking.client_id != user.id:
            raise HTTPException(status_code=403, detail="Unauthorized action.")

        # Find the latest preview/revision delivery
        from app.models.delivery import Delivery, DeliveryType, DeliveryStatus
        latest_delivery = db.query(Delivery).filter(
            Delivery.booking_id == booking_id,
            Delivery.delivery_type.in_([DeliveryType.PREVIEW, DeliveryType.REVISION])
        ).order_by(Delivery.version.desc()).first()

        if not latest_delivery:
            raise HTTPException(status_code=400, detail="No preview delivery package found to approve.")

        if latest_delivery.status == DeliveryStatus.APPROVED:
            raise HTTPException(status_code=400, detail="Preview draft is already approved.")

        # Set delivery status to approved
        latest_delivery.status = DeliveryStatus.APPROVED
        latest_delivery.approved_at = datetime.now()

        # Update booking remaining balance details
        booking.remaining_balance = booking.agreed_amount - booking.deposit_paid_amount
        db.commit()
        db.refresh(booking)

        # Notify freelancer
        try:
            from app.services.notification_service import NotificationService
            freelancer_profile = FreelancerRepository.get_profile_by_id(db, booking.freelancer_profile_id)
            NotificationService.dispatch(
                db=db,
                recipient_id=freelancer_profile.user_id,
                event_code="PREVIEW_APPROVED",
                title="Preview Approved",
                message=f"The client approved your preview draft. Remaining balance payment is now required.",
                action_url=f"/freelancer/bookings/{booking.id}",
                entity_type="booking",
                entity_id=booking.id
            )
        except Exception:
            pass

        return booking

    @staticmethod
    def approve_final_delivery(db: Session, user: User, booking_id: int) -> Booking:
        booking = BookingRepository.get_by_id(db, booking_id)
        if not booking or booking.client_id != user.id:
            raise HTTPException(status_code=403, detail="Unauthorized action.")

        if booking.payment_completion_state != "FULLY_PAID":
            raise HTTPException(status_code=400, detail="Remaining balance must be paid before final approval.")

        # Find latest final delivery
        from app.models.delivery import Delivery, DeliveryType, DeliveryStatus
        latest_delivery = db.query(Delivery).filter(
            Delivery.booking_id == booking_id,
            Delivery.delivery_type == DeliveryType.FINAL
        ).order_by(Delivery.version.desc()).first()

        if not latest_delivery:
            raise HTTPException(status_code=400, detail="No final delivery package found to approve.")

        if latest_delivery.status == DeliveryStatus.APPROVED:
            raise HTTPException(status_code=400, detail="Final delivery is already approved.")

        # Approve final delivery
        latest_delivery.status = DeliveryStatus.APPROVED
        latest_delivery.approved_at = datetime.now()

        # Set dispute window timestamps
        from datetime import timedelta
        booking.final_approved_at = datetime.now()
        booking.dispute_window_ends_at = datetime.now() + timedelta(hours=48)
        db.commit()
        db.refresh(booking)

        # Notify freelancer
        try:
            from app.services.notification_service import NotificationService
            freelancer_profile = FreelancerRepository.get_profile_by_id(db, booking.freelancer_profile_id)
            NotificationService.dispatch(
                db=db,
                recipient_id=freelancer_profile.user_id,
                event_code="FINAL_APPROVED",
                title="Final Project Approved",
                message=f"The client approved the final project. The 48-hour dispute window has started.",
                action_url=f"/freelancer/bookings/{booking.id}",
                entity_type="booking",
                entity_id=booking.id
            )
        except Exception:
            pass

        return booking
