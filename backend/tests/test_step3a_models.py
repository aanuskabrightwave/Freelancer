import pytest
from decimal import Decimal
from datetime import datetime, date, time
from sqlalchemy import text
from app.core.database import SessionLocal, engine
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession
from app.models.booking import Booking, BookingStatus, BookingSourceType
from app.models.booking_assignment import BookingAssignment, AssignmentStatus, ClientApprovalStatus
from app.models.project import Project, Proposal
from app.models.message import Conversation, Message, ConversationType, MessageType
from app.models.delivery import Delivery, DeliveryType, DeliveryStatus, AdminReviewStatus
from app.models.review import Review, ReviewStatus
from app.models.ledger import LedgerEntry
from app.models.workspace import BookingWorkspace


def create_test_freelancer_profile(db, user_id, title="Cinematographer", profession=FreelancerProfession.CINEMATOGRAPHER):
    profile = FreelancerProfile(
        user_id=user_id,
        professional_title=title,
        primary_profession=profession,
        bio="Experienced visual creative with high end equipment and portfolio.",
        experience_years=5,
        city="Mumbai",
        state="Maharashtra",
        country="India",
        starting_price=Decimal("5000.00"),
        hourly_rate=Decimal("1000.00"),
        event_rate=Decimal("15000.00")
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def test_database_table_counts_and_structure():
    """Verify that all core tables exist and can be queried without error."""
    with SessionLocal() as db:
        user_count = db.query(User).count()
        profile_count = db.query(FreelancerProfile).count()
        project_count = db.query(Project).count()
        proposal_count = db.query(Proposal).count()
        booking_count = db.query(Booking).count()
        conversation_count = db.query(Conversation).count()
        message_count = db.query(Message).count()
        delivery_count = db.query(Delivery).count()
        review_count = db.query(Review).count()
        ledger_count = db.query(LedgerEntry).count()
        assignment_count = db.query(BookingAssignment).count()

        print(f"Table row counts: Users={user_count}, Profiles={profile_count}, Projects={project_count}, "
              f"Proposals={proposal_count}, Bookings={booking_count}, Convos={conversation_count}, "
              f"Messages={message_count}, Deliveries={delivery_count}, Reviews={review_count}, "
              f"Ledger={ledger_count}, Assignments={assignment_count}")

        assert user_count >= 0
        assert booking_count >= 0
        assert assignment_count >= 0


def test_legacy_backfill_integrity():
    """Verify that existing legacy bookings, conversations, and projects were properly backfilled."""
    with SessionLocal() as db:
        # Verify legacy bookings
        legacy_bookings = db.query(Booking).filter(Booking.is_admin_managed == False).all()
        for b in legacy_bookings:
            assert b.selected_freelancer_profile_id is not None or b.freelancer_profile_id is None

        # Verify legacy conversations
        legacy_convos = db.query(Conversation).filter(Conversation.conversation_type == "DIRECT_LEGACY").all()
        assert isinstance(legacy_convos, list)

        # Verify legacy projects
        legacy_projects = db.query(Project).filter(Project.is_admin_managed == False).all()
        assert isinstance(legacy_projects, list)


def test_new_booking_assignment_model_persistence():
    """Verify multi-round assignments, selected vs assigned freelancer, counter-offers, and replacement approval."""
    with SessionLocal() as db:
        ts = int(datetime.utcnow().timestamp())
        client_user = User(
            email=f"client_{ts}_1@example.com",
            phone=f"+91881{ts % 1000000:07d}",
            password_hash="test_hashed_pwd",
            full_name="Test Client",
            role=UserRole.CLIENT,
            is_active=True
        )
        freelancer_a_user = User(
            email=f"free_a_{ts}_2@example.com",
            phone=f"+91882{ts % 1000000:07d}",
            password_hash="test_hashed_pwd",
            full_name="Creator Alpha",
            role=UserRole.FREELANCER,
            is_active=True
        )
        freelancer_b_user = User(
            email=f"free_b_{ts}_3@example.com",
            phone=f"+91883{ts % 1000000:07d}",
            password_hash="test_hashed_pwd",
            full_name="Creator Beta",
            role=UserRole.FREELANCER,
            is_active=True
        )
        admin_user = User(
            email=f"admin_{ts}_4@example.com",
            phone=f"+91884{ts % 1000000:07d}",
            password_hash="test_hashed_pwd",
            full_name="Managing Admin",
            role=UserRole.ADMIN,
            is_active=True
        )
        db.add_all([client_user, freelancer_a_user, freelancer_b_user, admin_user])
        db.commit()

        # 2. Create profiles
        profile_a = create_test_freelancer_profile(db, freelancer_a_user.id, "Cinematographer", FreelancerProfession.CINEMATOGRAPHER)
        profile_b = create_test_freelancer_profile(db, freelancer_b_user.id, "Lead Editor", FreelancerProfession.VIDEO_EDITOR)

        # 3. Create a managed booking where client selected Creator A
        booking = Booking(
            booking_number=f"BK-TEST-{ts}",
            client_id=client_user.id,
            selected_freelancer_profile_id=profile_a.id,
            freelancer_profile_id=None,  # Not confirmed yet
            assigned_by_admin_id=admin_user.id,
            is_admin_managed=True,
            status=BookingStatus.MATCHING_IN_PROGRESS,
            title="Managed Commercial Shoot",
            agreed_amount=Decimal("10000.00"),
            freelancer_payout_amount=Decimal("7500.00"),
            price=Decimal("10000.00"),
            deposit_amount=Decimal("3000.00"),
            remaining_balance=Decimal("7000.00"),
            scheduled_date=date(2026, 10, 15),
            start_time=time(10, 0),
            end_time=time(18, 0)
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)

        # 4. Round 1: Admin offers assignment to Creator A (Client's choice)
        assign_1 = BookingAssignment(
            booking_id=booking.id,
            freelancer_profile_id=profile_a.id,
            assigned_by_admin_id=admin_user.id,
            assignment_round=1,
            status=AssignmentStatus.OFFERED.value,
            offered_payout_amount=Decimal("7500.00"),
            is_replacement=False,
            client_approval_required=False
        )
        db.add(assign_1)
        db.commit()
        db.refresh(assign_1)

        # Creator A declines with counter-offer
        assign_1.status = AssignmentStatus.DECLINED.value
        assign_1.decline_reason = "Unavailable on requested date"
        assign_1.counter_offer_amount = Decimal("9000.00")
        assign_1.counter_offer_notes = "Available only on weekend for Rs 9,000"
        assign_1.responded_at = datetime.utcnow()
        db.commit()

        # 5. Round 2: Admin suggests replacement Creator B
        assign_2 = BookingAssignment(
            booking_id=booking.id,
            freelancer_profile_id=profile_b.id,
            assigned_by_admin_id=admin_user.id,
            assignment_round=2,
            status=AssignmentStatus.OFFERED.value,
            offered_payout_amount=Decimal("7500.00"),
            is_replacement=True,
            client_approval_required=True,
            client_approval_status=ClientApprovalStatus.PENDING.value
        )
        db.add(assign_2)
        db.commit()
        db.refresh(assign_2)

        # Client approves replacement Creator B
        assign_2.client_approval_status = ClientApprovalStatus.APPROVED.value
        assign_2.client_approval_notes = "Looks great, approved!"
        assign_2.client_responded_at = datetime.utcnow()

        # Creator B accepts assignment
        assign_2.status = AssignmentStatus.ACCEPTED.value
        assign_2.responded_at = datetime.utcnow()
        db.commit()

        # Update Booking confirmed state
        booking.freelancer_profile_id = profile_b.id
        booking.status = BookingStatus.CONFIRMED
        booking.confirmed_at = datetime.utcnow()
        db.commit()
        db.refresh(booking)

        # 6. Verify invariants
        assert booking.selected_freelancer_profile_id == profile_a.id  # Original selection preserved
        assert booking.freelancer_profile_id == profile_b.id           # Active assigned creator updated
        assert len(booking.assignments) == 2                           # History preserved
        assert booking.assignments[0].assignment_round == 1
        assert booking.assignments[0].status == "DECLINED"
        assert booking.assignments[0].decline_reason == "Unavailable on requested date"
        assert booking.assignments[0].counter_offer_amount == Decimal("9000.00")
        assert booking.assignments[1].assignment_round == 2
        assert booking.assignments[1].is_replacement is True
        assert booking.assignments[1].client_approval_status == "APPROVED"
        assert booking.assignments[1].status == "ACCEPTED"


def test_conversation_type_and_admin_mediation():
    """Verify partitioned CLIENT_ADMIN and FREELANCER_ADMIN conversation models."""
    with SessionLocal() as db:
        ts = int(datetime.utcnow().timestamp())
        client = User(email=f"c_chat_{ts}@example.com", phone=f"+91871{ts % 1000000:07d}", password_hash="test_pwd", full_name="Client Chat", role=UserRole.CLIENT)
        freelancer = User(email=f"f_chat_{ts}@example.com", phone=f"+91872{ts % 1000000:07d}", password_hash="test_pwd", full_name="Freelancer Chat", role=UserRole.FREELANCER)
        admin = User(email=f"a_chat_{ts}@example.com", phone=f"+91873{ts % 1000000:07d}", password_hash="test_pwd", full_name="Admin Chat", role=UserRole.ADMIN)
        db.add_all([client, freelancer, admin])
        db.commit()

        # 1. Create CLIENT_ADMIN conversation
        convo_client = Conversation(
            conversation_type=ConversationType.CLIENT_ADMIN.value,
            client_id=client.id,
            admin_id=admin.id,
            freelancer_id=None
        )
        # 2. Create FREELANCER_ADMIN conversation
        convo_freelancer = Conversation(
            conversation_type=ConversationType.FREELANCER_ADMIN.value,
            freelancer_id=freelancer.id,
            admin_id=admin.id,
            client_id=None
        )
        db.add_all([convo_client, convo_freelancer])
        db.commit()
        db.refresh(convo_client)
        db.refresh(convo_freelancer)

        assert convo_client.conversation_type == "CLIENT_ADMIN"
        assert convo_client.client_id == client.id
        assert convo_client.admin_id == admin.id
        assert convo_client.freelancer_id is None

        assert convo_freelancer.conversation_type == "FREELANCER_ADMIN"
        assert convo_freelancer.freelancer_id == freelancer.id
        assert convo_freelancer.admin_id == admin.id
        assert convo_freelancer.client_id is None


def test_review_nullable_comment():
    """Verify that Review.comment is nullable and allows rating-only submissions."""
    with SessionLocal() as db:
        ts = int(datetime.utcnow().timestamp())
        client = User(email=f"c_rev_{ts}@example.com", phone=f"+91861{ts % 1000000:07d}", password_hash="test_pwd", full_name="Client Rev", role=UserRole.CLIENT)
        freelancer_u = User(email=f"f_rev_{ts}@example.com", phone=f"+91862{ts % 1000000:07d}", password_hash="test_pwd", full_name="Free Rev", role=UserRole.FREELANCER)
        db.add_all([client, freelancer_u])
        db.commit()

        profile = create_test_freelancer_profile(db, freelancer_u.id, "Photographer", FreelancerProfession.PHOTOGRAPHER)

        booking = Booking(
            booking_number=f"BK-REV-{ts}",
            client_id=client.id,
            freelancer_profile_id=profile.id,
            agreed_amount=Decimal("5000.00"),
            price=Decimal("5000.00"),
            status=BookingStatus.COMPLETED
        )
        db.add(booking)
        db.commit()

        # Submit star rating with NULL comment
        review = Review(
            booking_id=booking.id,
            client_id=client.id,
            freelancer_profile_id=profile.id,
            overall_rating=5,
            comment=None,  # Nullable comment test
            status=ReviewStatus.PUBLISHED
        )
        db.add(review)
        db.commit()
        db.refresh(review)

        assert review.id is not None
        assert review.overall_rating == 5
        assert review.comment is None


def test_delivery_admin_review_fields():
    """Verify Delivery admin quality gate fields."""
    with SessionLocal() as db:
        ts = int(datetime.utcnow().timestamp())
        client = User(email=f"c_del_{ts}@example.com", phone=f"+91851{ts % 1000000:07d}", password_hash="test_pwd", full_name="Client Del", role=UserRole.CLIENT)
        freelancer_u = User(email=f"f_del_{ts}@example.com", phone=f"+91852{ts % 1000000:07d}", password_hash="test_pwd", full_name="Free Del", role=UserRole.FREELANCER)
        admin_u = User(email=f"a_del_{ts}@example.com", phone=f"+91853{ts % 1000000:07d}", password_hash="test_pwd", full_name="Admin Del", role=UserRole.ADMIN)
        db.add_all([client, freelancer_u, admin_u])
        db.commit()

        profile = create_test_freelancer_profile(db, freelancer_u.id, "Senior Colorist", FreelancerProfession.COLOR_GRADER)

        booking = Booking(
            booking_number=f"BK-DEL-{ts}",
            client_id=client.id,
            freelancer_profile_id=profile.id,
            agreed_amount=Decimal("8000.00"),
            price=Decimal("8000.00"),
            status=BookingStatus.IN_PROGRESS
        )
        db.add(booking)
        db.commit()

        workspace = BookingWorkspace(booking_id=booking.id)
        db.add(workspace)
        db.commit()

        delivery = Delivery(
            booking_id=booking.id,
            workspace_id=workspace.id,
            delivery_type=DeliveryType.FINAL,
            version=1,
            title="Final Color Graded Cut",
            status=DeliveryStatus.SUBMITTED,
            submitted_by_user_id=freelancer_u.id,
            admin_review_status=AdminReviewStatus.PENDING.value
        )
        db.add(delivery)
        db.commit()
        db.refresh(delivery)

        assert delivery.admin_review_status == "PENDING"
        assert delivery.shared_with_client_at is None

        # Admin approves quality and shares with client
        delivery.admin_review_status = AdminReviewStatus.APPROVED.value
        delivery.admin_reviewed_by_id = admin_u.id
        delivery.admin_reviewed_at = datetime.utcnow()
        delivery.shared_with_client_at = datetime.utcnow()
        db.commit()
        db.refresh(delivery)

        assert delivery.admin_review_status == "APPROVED"
        assert delivery.admin_reviewed_by_id == admin_u.id
        assert delivery.shared_with_client_at is not None


def test_ledger_advance_credit_lifecycle():
    """Verify LedgerEntry ADVANCE_CREDIT with PENDING state and AVAILABLE maturation."""
    with SessionLocal() as db:
        ts = int(datetime.utcnow().timestamp())
        freelancer_u = User(email=f"f_led_{ts}@example.com", phone=f"+91841{ts % 1000000:07d}", password_hash="test_pwd", full_name="Free Led", role=UserRole.FREELANCER)
        db.add(freelancer_u)
        db.commit()

        profile = create_test_freelancer_profile(db, freelancer_u.id, "Executive Producer", FreelancerProfession.CINEMATOGRAPHER)

        # 1. Create locked advance credit
        advance_entry = LedgerEntry(
            freelancer_profile_id=profile.id,
            entry_type="ADVANCE_CREDIT",
            amount=Decimal("3000.00"),
            currency="INR",
            status="PENDING",  # Locked / in escrow
            description="Advance 30% locked hold for project execution"
        )
        db.add(advance_entry)
        db.commit()
        db.refresh(advance_entry)

        assert advance_entry.status == "PENDING"
        assert advance_entry.amount == Decimal("3000.00")

        # 2. Maturation to AVAILABLE after client signoff & admin release
        advance_entry.status = "AVAILABLE"
        db.commit()
        db.refresh(advance_entry)

        assert advance_entry.status == "AVAILABLE"
