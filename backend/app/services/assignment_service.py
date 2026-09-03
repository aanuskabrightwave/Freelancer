from datetime import datetime, date, time
from decimal import Decimal
from typing import Optional, List, Dict, Any
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, desc

from app.models.booking import Booking, BookingStatus, BookingSourceType
from app.models.booking_assignment import BookingAssignment, AssignmentStatus, ClientApprovalStatus
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile
from app.models.service import Service
from app.models.service_package import ServicePackage
from app.models.project import Project, Proposal
from app.schemas.assignment import (
    AdminAssignFreelancerPayload, AdminReviewBookingPayload,
    FreelancerRejectPayload, ClientReplacementDecisionPayload,
    AdminBookingListItem, AdminBookingDetail, BookingAssignmentOut,
    FreelancerAssignmentListItem, PaymentSummaryOut, UserMiniOut, FreelancerMiniOut
)
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService


class AssignmentService:

    @staticmethod
    def _build_payment_summary(booking: Booking) -> PaymentSummaryOut:
        return PaymentSummaryOut(
            agreed_amount=booking.agreed_amount or Decimal("0.00"),
            deposit_amount=booking.deposit_amount or Decimal("0.00"),
            deposit_paid_amount=booking.deposit_paid_amount or Decimal("0.00"),
            remaining_balance=booking.remaining_balance or Decimal("0.00"),
            total_paid=booking.total_paid or Decimal("0.00"),
            payment_completion_state=booking.payment_completion_state or "UNPAID",
            currency=booking.currency or "INR"
        )

    @staticmethod
    def _build_user_mini(user: Optional[User]) -> Optional[UserMiniOut]:
        if not user:
            return None
        return UserMiniOut(
            id=user.id,
            full_name=user.full_name,
            email=user.email,
            phone=user.phone
        )

    @staticmethod
    def _build_freelancer_mini(profile: Optional[FreelancerProfile]) -> Optional[FreelancerMiniOut]:
        if not profile:
            return None
        return FreelancerMiniOut(
            id=profile.id,
            user_id=profile.user_id,
            professional_title=profile.professional_title,
            primary_profession=profile.primary_profession.value if hasattr(profile.primary_profession, "value") else str(profile.primary_profession) if profile.primary_profession else None,
            city=profile.city,
            full_name=profile.user.full_name if profile.user else None,
            user=AssignmentService._build_user_mini(profile.user) if profile.user else None
        )

    @staticmethod
    def _build_assignment_out(assignment: BookingAssignment) -> BookingAssignmentOut:
        return BookingAssignmentOut(
            id=assignment.id,
            booking_id=assignment.booking_id,
            freelancer_profile_id=assignment.freelancer_profile_id,
            assigned_by_admin_id=assignment.assigned_by_admin_id,
            assignment_round=assignment.assignment_round,
            status=assignment.status,
            offered_payout_amount=assignment.offered_payout_amount,
            decline_reason=assignment.decline_reason,
            counter_offer_amount=assignment.counter_offer_amount,
            counter_offer_notes=assignment.counter_offer_notes,
            is_replacement=assignment.is_replacement,
            client_approval_required=assignment.client_approval_required,
            client_approval_status=assignment.client_approval_status,
            client_approval_notes=assignment.client_approval_notes,
            client_responded_at=assignment.client_responded_at,
            expires_at=assignment.expires_at,
            offered_at=assignment.offered_at,
            responded_at=assignment.responded_at,
            created_at=assignment.created_at,
            updated_at=assignment.updated_at,
            freelancer_profile=AssignmentService._build_freelancer_mini(assignment.freelancer_profile),
            assigned_by_admin=AssignmentService._build_user_mini(assignment.assigned_by_admin)
        )

    # -------------------------------------------------------------------------
    # PART 2: ADMIN BOOKING LIST
    # -------------------------------------------------------------------------
    @staticmethod
    def list_admin_bookings(
        db: Session,
        status_filter: Optional[str] = None,
        assignment_status: Optional[str] = None,
        source_type: Optional[str] = None,
        date_from: Optional[date] = None,
        date_to: Optional[date] = None,
        client_id: Optional[int] = None,
        freelancer_profile_id: Optional[int] = None,
        search: Optional[str] = None,
        page: int = 1,
        page_size: int = 20
    ) -> List[AdminBookingListItem]:
        query = db.query(Booking)

        if status_filter:
            query = query.filter(Booking.status == status_filter)

        if source_type:
            query = query.filter(Booking.source_type == source_type)

        if date_from:
            query = query.filter(Booking.scheduled_date >= date_from)

        if date_to:
            query = query.filter(Booking.scheduled_date <= date_to)

        if client_id:
            query = query.filter(Booking.client_id == client_id)

        if freelancer_profile_id:
            query = query.filter(
                or_(
                    Booking.freelancer_profile_id == freelancer_profile_id,
                    Booking.selected_freelancer_profile_id == freelancer_profile_id
                )
            )

        if search:
            query = query.filter(
                or_(
                    Booking.booking_number.ilike(f"%{search}%"),
                    Booking.title.ilike(f"%{search}%"),
                    Booking.location_city.ilike(f"%{search}%"),
                    Booking.venue_name.ilike(f"%{search}%")
                )
            )

        if assignment_status:
            latest_assignment_subquery = (
                db.query(
                    BookingAssignment.booking_id,
                    BookingAssignment.status
                )
                .filter(BookingAssignment.status == assignment_status)
                .subquery()
            )
            query = query.join(latest_assignment_subquery, Booking.id == latest_assignment_subquery.c.booking_id)

        offset = (page - 1) * page_size
        bookings = query.order_by(Booking.created_at.desc()).offset(offset).limit(page_size).all()

        results: List[AdminBookingListItem] = []
        for b in bookings:
            active_assign = None
            if b.assignments:
                sorted_assigns = sorted(b.assignments, key=lambda a: a.assignment_round, reverse=True)
                active_assign = AssignmentService._build_assignment_out(sorted_assigns[0])

            results.append(
                AdminBookingListItem(
                    id=b.id,
                    booking_number=b.booking_number,
                    title=b.title,
                    source_type=b.source_type,
                    status=b.status,
                    scheduled_date=b.scheduled_date,
                    start_time=b.start_time,
                    end_time=b.end_time,
                    location_city=b.location_city,
                    venue_name=b.venue_name,
                    agreed_amount=b.agreed_amount,
                    freelancer_payout_amount=b.freelancer_payout_amount,
                    currency=b.currency,
                    is_admin_managed=b.is_admin_managed,
                    created_at=b.created_at,
                    client=AssignmentService._build_user_mini(b.client),
                    selected_freelancer=AssignmentService._build_freelancer_mini(b.selected_freelancer),
                    freelancer=AssignmentService._build_freelancer_mini(b.freelancer),
                    active_assignment=active_assign,
                    payment_summary=AssignmentService._build_payment_summary(b)
                )
            )
        return results

    # -------------------------------------------------------------------------
    # PART 3: ADMIN BOOKING DETAIL
    # -------------------------------------------------------------------------
    @staticmethod
    def get_admin_booking_detail(db: Session, booking_id: int) -> AdminBookingDetail:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking with ID {booking_id} not found."
            )

        assignments_out = [
            AssignmentService._build_assignment_out(a)
            for a in sorted(booking.assignments, key=lambda a: a.assignment_round)
        ]

        return AdminBookingDetail(
            id=booking.id,
            booking_number=booking.booking_number,
            title=booking.title,
            description=booking.description,
            source_type=booking.source_type,
            booking_type=booking.booking_type,
            status=booking.status,
            agreed_amount=booking.agreed_amount,
            scheduled_date=booking.scheduled_date,
            start_time=booking.start_time,
            end_time=booking.end_time,
            timezone=booking.timezone,
            location_city=booking.location_city,
            location_state=booking.location_state,
            location_country=booking.location_country,
            venue_name=booking.venue_name,
            venue_address=booking.venue_address,
            notes=booking.notes,
            admin_notes=booking.admin_notes,
            is_admin_managed=booking.is_admin_managed,
            service_id=booking.service_id,
            service_package_id=booking.service_package_id,
            selected_freelancer_profile_id=booking.selected_freelancer_profile_id,
            freelancer_profile_id=booking.freelancer_profile_id,
            project_id=booking.project_id,
            proposal_id=booking.proposal_id,
            requirements_answers=booking.requirements_answers,
            confirmed_at=booking.confirmed_at,
            started_at=booking.started_at,
            completed_at=booking.completed_at,
            cancelled_at=booking.cancelled_at,
            created_at=booking.created_at,
            updated_at=booking.updated_at,
            client=AssignmentService._build_user_mini(booking.client),
            selected_freelancer=AssignmentService._build_freelancer_mini(booking.selected_freelancer),
            freelancer=AssignmentService._build_freelancer_mini(booking.freelancer),
            assigned_by_admin=AssignmentService._build_user_mini(booking.assigned_by_admin),
            payment_summary=AssignmentService._build_payment_summary(booking),
            assignments=assignments_out
        )

    # -------------------------------------------------------------------------
    # PART 4: ADMIN REVIEW BOOKING
    # -------------------------------------------------------------------------
    @staticmethod
    def review_booking(
        db: Session,
        admin_user: User,
        booking_id: int,
        payload: AdminReviewBookingPayload
    ) -> AdminBookingDetail:
        booking = db.query(Booking).filter(Booking.id == booking_id).with_for_update().first()
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking with ID {booking_id} not found."
            )

        # Disallow reviewing finished/cancelled bookings
        if booking.status in [BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.REJECTED, BookingStatus.IN_PROGRESS]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot transition booking in {booking.status.value} state to MATCHING_IN_PROGRESS."
            )

        booking.status = BookingStatus.MATCHING_IN_PROGRESS
        booking.assigned_by_admin_id = admin_user.id
        if payload.admin_notes:
            booking.admin_notes = payload.admin_notes

        db.commit()
        db.refresh(booking)

        # Record audit log
        AuditService.log_action(
            db=db,
            admin_user_id=admin_user.id,
            action="BOOKING_REVIEWED",
            entity_type="BOOKING",
            entity_id=booking.id,
            description=f"Admin {admin_user.full_name} reviewed booking {booking.booking_number} and initiated creator matching.",
            metadata_json={"admin_notes": payload.admin_notes} if payload.admin_notes else None
        )

        return AssignmentService.get_admin_booking_detail(db, booking_id)

    # -------------------------------------------------------------------------
    # PART 5: ADMIN ASSIGN FREELANCER
    # -------------------------------------------------------------------------
    @staticmethod
    def assign_freelancer(
        db: Session,
        admin_user: User,
        booking_id: int,
        payload: AdminAssignFreelancerPayload
    ) -> BookingAssignmentOut:
        # 1. Lock booking row for concurrency protection
        booking = db.query(Booking).filter(Booking.id == booking_id).with_for_update().first()
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking with ID {booking_id} not found."
            )

        # 2. Check assignable state
        if booking.status in [BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.REJECTED]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot assign creator to booking in {booking.status.value} state."
            )

        # 3. Validate Freelancer Profile
        profile = db.query(FreelancerProfile).filter(FreelancerProfile.id == payload.freelancer_profile_id).first()
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"FreelancerProfile with ID {payload.freelancer_profile_id} not found."
            )

        # 4. Validate Freelancer User & Role
        freelancer_user = db.query(User).filter(User.id == profile.user_id).first()
        if not freelancer_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account associated with this freelancer profile not found."
            )

        if not freelancer_user.is_active:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign an inactive freelancer user."
            )

        if freelancer_user.role != UserRole.FREELANCER:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="User does not possess the FREELANCER role."
            )

        # 5. Prevent assigning creator if they are the booking's client
        if profile.user_id == booking.client_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot assign client as the freelancer on their own booking."
            )

        # 6. Check existing assignment status for concurrency / duplicate protection
        existing_accepted_offer = (
            db.query(BookingAssignment)
            .filter(
                BookingAssignment.booking_id == booking_id,
                BookingAssignment.status == AssignmentStatus.ACCEPTED.value
            )
            .first()
        )
        if existing_accepted_offer:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"An assignment offer has already been ACCEPTED for this booking (Round {existing_accepted_offer.assignment_round})."
            )

        existing_open_offer = (
            db.query(BookingAssignment)
            .filter(
                BookingAssignment.booking_id == booking_id,
                BookingAssignment.status == AssignmentStatus.OFFERED.value
            )
            .first()
        )
        if existing_open_offer:
            if existing_open_offer.freelancer_profile_id == payload.freelancer_profile_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail=f"An active assignment offer already exists for this creator (Round {existing_open_offer.assignment_round})."
                )
            existing_open_offer.status = AssignmentStatus.CANCELLED.value
            existing_open_offer.responded_at = datetime.utcnow()

        # 7. Determine offered payout amount
        offered_amount = payload.offered_payout_amount
        if offered_amount is None:
            if booking.freelancer_payout_amount is not None:
                offered_amount = booking.freelancer_payout_amount
            else:
                offered_amount = (booking.agreed_amount or Decimal("0.00")) * Decimal("0.75")

        # 8. Determine Replacement Rule
        is_replacement = False
        client_approval_required = False
        client_approval_status = ClientApprovalStatus.NOT_REQUIRED.value

        if booking.selected_freelancer_profile_id:
            if booking.selected_freelancer_profile_id != payload.freelancer_profile_id:
                is_replacement = True
                client_approval_required = True
                client_approval_status = ClientApprovalStatus.PENDING.value
        else:
            is_replacement = False
            client_approval_required = False
            client_approval_status = ClientApprovalStatus.NOT_REQUIRED.value

        # 9. Compute next assignment round
        max_round = db.query(func.max(BookingAssignment.assignment_round)).filter(
            BookingAssignment.booking_id == booking_id
        ).scalar() or 0
        assignment_round = max_round + 1

        # 10. Persist BookingAssignment
        assignment = BookingAssignment(
            booking_id=booking.id,
            freelancer_profile_id=profile.id,
            assigned_by_admin_id=admin_user.id,
            assignment_round=assignment_round,
            status=AssignmentStatus.OFFERED.value,
            offered_payout_amount=offered_amount,
            is_replacement=is_replacement,
            client_approval_required=client_approval_required,
            client_approval_status=client_approval_status,
            expires_at=payload.expires_at,
            offered_at=datetime.utcnow()
        )
        db.add(assignment)

        # 11. Update Booking state (DO NOT SET freelancer_profile_id YET!)
        booking.status = BookingStatus.MATCHING_IN_PROGRESS
        booking.assigned_by_admin_id = admin_user.id
        booking.freelancer_payout_amount = offered_amount
        if payload.admin_notes:
            booking.admin_notes = payload.admin_notes

        db.commit()
        db.refresh(assignment)
        db.refresh(booking)

        # 12. Audit Log
        action_name = "REPLACEMENT_SUGGESTED" if is_replacement else "FREELANCER_ASSIGNED"
        AuditService.log_action(
            db=db,
            admin_user_id=admin_user.id,
            action=action_name,
            entity_type="BOOKING_ASSIGNMENT",
            entity_id=assignment.id,
            description=f"Admin {admin_user.full_name} assigned creator {freelancer_user.full_name} (Round {assignment_round}) at ₹{offered_amount:.2f}.",
            metadata_json={
                "booking_id": booking.id,
                "freelancer_profile_id": profile.id,
                "is_replacement": is_replacement,
                "assignment_round": assignment_round,
                "offered_payout_amount": str(offered_amount)
            }
        )

        # 13. Notifications (No direct client-freelancer conversation!)
        NotificationService.dispatch(
            db=db,
            recipient_id=freelancer_user.id,
            event_code="BOOKING_ASSIGNED",
            title="New Booking Assignment Offer",
            message=f"You have received a new assignment offer for booking '{booking.title or booking.booking_number}' at ₹{offered_amount:.2f}.",
            entity_type="BOOKING",
            entity_id=booking.id,
            action_url=f"/freelancer/bookings/{booking.id}"
        )

        if is_replacement:
            NotificationService.dispatch(
                db=db,
                recipient_id=booking.client_id,
                event_code="REPLACEMENT_REQUESTED",
                title="Creator Replacement Proposed",
                message=f"Admin proposed an alternative creator ({freelancer_user.full_name}) for booking {booking.booking_number}. Please review and approve.",
                entity_type="BOOKING",
                entity_id=booking.id,
                action_url=f"/client/bookings/{booking.id}"
            )

        # 14. Auto-create FREELANCER_ADMIN conversation (No direct Client-Freelancer chat!)
        from app.services.admin_messaging_service import AdminMessagingService
        AdminMessagingService.get_or_create_freelancer_admin_conversation(
            db=db,
            freelancer_user_id=freelancer_user.id,
            booking_id=booking.id,
            admin_id=admin_user.id
        )

        return AssignmentService._build_assignment_out(assignment)

    # -------------------------------------------------------------------------
    # PART 6: FREELANCER ASSIGNMENT LIST
    # -------------------------------------------------------------------------
    @staticmethod
    def list_freelancer_assignments(
        db: Session,
        freelancer_user: User
    ) -> List[FreelancerAssignmentListItem]:
        profile = db.query(FreelancerProfile).filter(FreelancerProfile.user_id == freelancer_user.id).first()
        if not profile:
            return []

        assignments = (
            db.query(BookingAssignment)
            .join(Booking, BookingAssignment.booking_id == Booking.id)
            .filter(BookingAssignment.freelancer_profile_id == profile.id)
            .order_by(BookingAssignment.created_at.desc())
            .all()
        )

        items: List[FreelancerAssignmentListItem] = []
        for a in assignments:
            b = a.booking
            items.append(
                FreelancerAssignmentListItem(
                    id=a.id,
                    booking_id=b.id,
                    booking_number=b.booking_number,
                    assignment_round=a.assignment_round,
                    status=a.status,
                    offered_payout_amount=a.offered_payout_amount,
                    is_replacement=a.is_replacement,
                    decline_reason=a.decline_reason,
                    counter_offer_amount=a.counter_offer_amount,
                    counter_offer_notes=a.counter_offer_notes,
                    offered_at=a.offered_at,
                    expires_at=a.expires_at,
                    responded_at=a.responded_at,
                    title=b.title,
                    description=b.description,
                    scheduled_date=b.scheduled_date,
                    start_time=b.start_time,
                    end_time=b.end_time,
                    location_city=b.location_city,
                    location_state=b.location_state,
                    venue_name=b.venue_name,
                    source_type=b.source_type.value if hasattr(b.source_type, "value") else str(b.source_type)
                )
            )
        return items

    # -------------------------------------------------------------------------
    # PART 7: FREELANCER ACCEPT ASSIGNMENT
    # -------------------------------------------------------------------------
    @staticmethod
    def freelancer_accept_assignment(
        db: Session,
        freelancer_user: User,
        assignment_id: int
    ) -> BookingAssignmentOut:
        assignment = db.query(BookingAssignment).filter(BookingAssignment.id == assignment_id).with_for_update().first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"BookingAssignment with ID {assignment_id} not found."
            )

        # Validate ownership
        profile = db.query(FreelancerProfile).filter(FreelancerProfile.id == assignment.freelancer_profile_id).first()
        if not profile or profile.user_id != freelancer_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to respond to this assignment."
            )

        # Idempotency check
        if assignment.status == AssignmentStatus.ACCEPTED.value:
            return AssignmentService._build_assignment_out(assignment)

        # Validate status
        if assignment.status != AssignmentStatus.OFFERED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot accept assignment in {assignment.status} status."
            )

        assignment.status = AssignmentStatus.ACCEPTED.value
        assignment.responded_at = datetime.utcnow()

        # Finalization helper
        finalized = AssignmentService.try_finalize_assignment(db, assignment)

        if not finalized:
            # Replacement assignment accepted by creator, but still waiting for client approval
            AuditService.log_action(
                db=db,
                admin_user_id=assignment.assigned_by_admin_id,
                action="FREELANCER_ACCEPTED_AWAITING_CLIENT",
                entity_type="BOOKING_ASSIGNMENT",
                entity_id=assignment.id,
                description=f"Creator {freelancer_user.full_name} accepted replacement assignment, awaiting client approval."
            )
            # Notify Admin
            NotificationService.dispatch(
                db=db,
                recipient_id=assignment.assigned_by_admin_id,
                event_code="ASSIGNMENT_ACCEPTED",
                title="Creator Accepted Assignment (Awaiting Client Approval)",
                message=f"Creator {freelancer_user.full_name} accepted replacement offer for booking {assignment.booking.booking_number}.",
                entity_type="BOOKING",
                entity_id=assignment.booking_id
            )

        db.commit()
        db.refresh(assignment)
        return AssignmentService._build_assignment_out(assignment)

    # -------------------------------------------------------------------------
    # PART 8: FREELANCER REJECT ASSIGNMENT / COUNTER OFFER
    # -------------------------------------------------------------------------
    @staticmethod
    def freelancer_reject_assignment(
        db: Session,
        freelancer_user: User,
        assignment_id: int,
        payload: FreelancerRejectPayload
    ) -> BookingAssignmentOut:
        assignment = db.query(BookingAssignment).filter(BookingAssignment.id == assignment_id).with_for_update().first()
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"BookingAssignment with ID {assignment_id} not found."
            )

        # Validate ownership
        profile = db.query(FreelancerProfile).filter(FreelancerProfile.id == assignment.freelancer_profile_id).first()
        if not profile or profile.user_id != freelancer_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to respond to this assignment."
            )

        # Validate status
        if assignment.status != AssignmentStatus.OFFERED.value:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot decline assignment in {assignment.status} status."
            )

        if not payload.reason or not payload.reason.strip():
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Mandatory decline reason cannot be blank."
            )

        assignment.status = AssignmentStatus.DECLINED.value
        assignment.decline_reason = payload.reason.strip()
        assignment.responded_at = datetime.utcnow()

        action_name = "FREELANCER_REJECTED"
        event_code = "ASSIGNMENT_DECLINED"

        if payload.counter_offer_amount is not None and payload.counter_offer_amount > 0:
            assignment.counter_offer_amount = payload.counter_offer_amount
            assignment.counter_offer_notes = payload.counter_offer_notes
            action_name = "COUNTER_OFFER_RECEIVED"
            event_code = "ASSIGNMENT_COUNTERED"

        # Booking remains in MATCHING_IN_PROGRESS for Admin matching/renegotiation
        assignment.booking.status = BookingStatus.MATCHING_IN_PROGRESS

        db.commit()
        db.refresh(assignment)

        # Log audit action
        AuditService.log_action(
            db=db,
            admin_user_id=assignment.assigned_by_admin_id,
            action=action_name,
            entity_type="BOOKING_ASSIGNMENT",
            entity_id=assignment.id,
            description=f"Creator {freelancer_user.full_name} declined assignment. Reason: {payload.reason.strip()}",
            metadata_json={
                "decline_reason": payload.reason.strip(),
                "counter_offer_amount": str(payload.counter_offer_amount) if payload.counter_offer_amount else None,
                "counter_offer_notes": payload.counter_offer_notes
            }
        )

        # Notify Admin
        NotificationService.dispatch(
            db=db,
            recipient_id=assignment.assigned_by_admin_id,
            event_code=event_code,
            title="Assignment Declined / Counter-Offer" if payload.counter_offer_amount else "Assignment Declined",
            message=f"Creator {freelancer_user.full_name} declined assignment for booking {assignment.booking.booking_number}. Reason: {payload.reason.strip()}",
            entity_type="BOOKING",
            entity_id=assignment.booking_id
        )

        return AssignmentService._build_assignment_out(assignment)

    # -------------------------------------------------------------------------
    # PART 10: CLIENT REPLACEMENT APPROVAL
    # -------------------------------------------------------------------------
    @staticmethod
    def client_respond_to_replacement(
        db: Session,
        client_user: User,
        booking_id: int,
        assignment_id: int,
        payload: ClientReplacementDecisionPayload
    ) -> BookingAssignmentOut:
        booking = db.query(Booking).filter(Booking.id == booking_id).first()
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Booking with ID {booking_id} not found."
            )

        # Only the booking's client can approve/reject replacement
        if booking.client_id != client_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not authorized to respond to replacements for this booking."
            )

        assignment = (
            db.query(BookingAssignment)
            .filter(
                BookingAssignment.id == assignment_id,
                BookingAssignment.booking_id == booking_id
            )
            .with_for_update()
            .first()
        )
        if not assignment:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Assignment with ID {assignment_id} for booking {booking_id} not found."
            )

        if not assignment.is_replacement or not assignment.client_approval_required:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Client approval is not required for this assignment."
            )

        if payload.approved:
            # Idempotency check
            if assignment.client_approval_status == ClientApprovalStatus.APPROVED.value:
                return AssignmentService._build_assignment_out(assignment)

            assignment.client_approval_status = ClientApprovalStatus.APPROVED.value
            assignment.client_approval_notes = payload.notes
            assignment.client_responded_at = datetime.utcnow()

            finalized = AssignmentService.try_finalize_assignment(db, assignment)

            if not finalized:
                AuditService.log_action(
                    db=db,
                    admin_user_id=assignment.assigned_by_admin_id,
                    action="REPLACEMENT_APPROVED_AWAITING_FREELANCER",
                    entity_type="BOOKING_ASSIGNMENT",
                    entity_id=assignment.id,
                    description=f"Client {client_user.full_name} approved replacement creator, awaiting creator acceptance."
                )
                NotificationService.dispatch(
                    db=db,
                    recipient_id=assignment.assigned_by_admin_id,
                    event_code="REPLACEMENT_APPROVED",
                    title="Client Approved Replacement Creator",
                    message=f"Client approved replacement creator for booking {booking.booking_number}.",
                    entity_type="BOOKING",
                    entity_id=booking.id
                )
        else:
            # Idempotency check
            if assignment.client_approval_status == ClientApprovalStatus.REJECTED.value:
                return AssignmentService._build_assignment_out(assignment)

            assignment.client_approval_status = ClientApprovalStatus.REJECTED.value
            assignment.client_approval_notes = payload.notes
            assignment.client_responded_at = datetime.utcnow()
            assignment.status = AssignmentStatus.CANCELLED.value

            # Booking remains in MATCHING_IN_PROGRESS
            booking.status = BookingStatus.MATCHING_IN_PROGRESS

            AuditService.log_action(
                db=db,
                admin_user_id=assignment.assigned_by_admin_id,
                action="REPLACEMENT_REJECTED",
                entity_type="BOOKING_ASSIGNMENT",
                entity_id=assignment.id,
                description=f"Client {client_user.full_name} rejected replacement creator. Notes: {payload.notes or 'None'}"
            )
            NotificationService.dispatch(
                db=db,
                recipient_id=assignment.assigned_by_admin_id,
                event_code="REPLACEMENT_REJECTED",
                title="Client Rejected Replacement Creator",
                message=f"Client declined replacement creator for booking {booking.booking_number}. Admin matching required.",
                entity_type="BOOKING",
                entity_id=booking.id
            )

        db.commit()
        db.refresh(assignment)
        return AssignmentService._build_assignment_out(assignment)

    # -------------------------------------------------------------------------
    # PART 11 & 12: TWO-CONDITION FINALIZATION HELPER
    # -------------------------------------------------------------------------
    @staticmethod
    def try_finalize_assignment(db: Session, assignment: BookingAssignment) -> bool:
        """
        Enforces two-condition finalization:
        Condition 1: Assignment accepted by freelancer (status == ACCEPTED)
        Condition 2: If replacement, client approval satisfied (client_approval_status == APPROVED)
        """
        if assignment.status != AssignmentStatus.ACCEPTED.value:
            return False

        if assignment.is_replacement and assignment.client_approval_required:
            if assignment.client_approval_status != ClientApprovalStatus.APPROVED.value:
                return False

        booking = assignment.booking
        if not booking:
            booking = db.query(Booking).filter(Booking.id == assignment.booking_id).first()

        if not booking or booking.status in [BookingStatus.COMPLETED, BookingStatus.CANCELLED, BookingStatus.REJECTED]:
            return False

        # Atomically set active assigned creator on booking
        booking.freelancer_profile_id = assignment.freelancer_profile_id
        booking.status = BookingStatus.CONFIRMED
        booking.confirmed_at = datetime.utcnow()

        # Audit
        AuditService.log_action(
            db=db,
            admin_user_id=assignment.assigned_by_admin_id,
            action="ASSIGNMENT_CONFIRMED",
            entity_type="BOOKING",
            entity_id=booking.id,
            description=f"Booking {booking.booking_number} successfully matched and confirmed with creator ID {assignment.freelancer_profile_id} (Round {assignment.assignment_round}).",
            metadata_json={
                "assignment_id": assignment.id,
                "freelancer_profile_id": assignment.freelancer_profile_id,
                "is_replacement": assignment.is_replacement,
                "payout_amount": str(assignment.offered_payout_amount)
            }
        )

        # Notify Client
        NotificationService.dispatch(
            db=db,
            recipient_id=booking.client_id,
            event_code="BOOKING_CONFIRMED",
            title="Creator Confirmed for Your Booking!",
            message=f"Creator assignment is confirmed for booking {booking.booking_number}. Next step: review workspace details.",
            entity_type="BOOKING",
            entity_id=booking.id
        )

        # Notify Freelancer
        freelancer_user_id = assignment.freelancer_profile.user_id if assignment.freelancer_profile else None
        if freelancer_user_id:
            NotificationService.dispatch(
                db=db,
                recipient_id=freelancer_user_id,
                event_code="BOOKING_CONFIRMED",
                title="Booking Assignment Finalized!",
                message=f"You are officially confirmed for booking {booking.booking_number}.",
                entity_type="BOOKING",
                entity_id=booking.id
            )

        # Notify Admin
        NotificationService.dispatch(
            db=db,
            recipient_id=assignment.assigned_by_admin_id,
            event_code="BOOKING_CONFIRMED",
            title="Booking Matched & Confirmed",
            message=f"Booking {booking.booking_number} assignment is finalized and confirmed.",
            entity_type="BOOKING",
            entity_id=booking.id
        )

        return True
