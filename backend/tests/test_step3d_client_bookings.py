import pytest
from decimal import Decimal
from datetime import datetime, date, time, timedelta
from typing import Optional, List, Dict, Any
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_token
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession
from app.models.booking import Booking, BookingStatus, BookingSourceType
from app.models.booking_assignment import BookingAssignment
from app.models.message import Conversation, Message, ConversationType
from app.models.conversation_participant import ConversationParticipant
from app.models.notification import Notification
from app.models.service import Service, ServiceStatus, ServiceType
from app.models.service_package import ServicePackage
from app.models.service_category import ServiceCategory
from app.models.admin_audit_log import AdminAuditLog
from app.models.project import Project, Proposal

client = TestClient(app)


def get_token_for_user(user: User) -> str:
    return create_token(subject=user.id, token_type="access", role=user.role.value if hasattr(user.role, "value") else str(user.role))


def create_fixture_user(db, role: UserRole, prefix: str, is_active: bool = True) -> User:
    ts = int(datetime.utcnow().timestamp() * 1000) % 10000000
    user = User(
        email=f"{prefix}_{ts}@testdomain.com",
        phone=f"+9188{ts:08d}"[:13],
        password_hash="hashed_test_password",
        full_name=f"User {prefix.title()} {ts}",
        role=role,
        is_active=is_active
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_fixture_profile(db, user: User, title="Lead Cinematographer", is_public: bool = True) -> FreelancerProfile:
    profile = FreelancerProfile(
        user_id=user.id,
        professional_title=title,
        primary_profession=FreelancerProfession.CINEMATOGRAPHER,
        bio="Test creator bio with rich equipment and portfolio.",
        experience_years=5,
        city="Mumbai",
        state="Maharashtra",
        country="India",
        starting_price=Decimal("6000.00"),
        hourly_rate=Decimal("1500.00"),
        event_rate=Decimal("20000.00"),
        is_profile_public=is_public
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def create_fixture_service(db, freelancer_profile_id: int) -> tuple[Service, ServicePackage]:
    cat = db.query(ServiceCategory).first()
    if not cat:
        cat = ServiceCategory(name="Cinematography", slug="cinematography")
        db.add(cat)
        db.commit()
        db.refresh(cat)
        
    ts = int(datetime.utcnow().timestamp() * 1000) % 10000000
    service = Service(
        freelancer_profile_id=freelancer_profile_id,
        category_id=cat.id,
        title=f"Wedding Highlights Video {ts}",
        slug=f"wedding-highlights-{ts}",
        short_description="We will shoot your beautiful moments.",
        description="Detailed package offering for cinematography.",
        status=ServiceStatus.PUBLISHED,
        service_type=ServiceType.REMOTE
    )
    db.add(service)
    db.commit()
    db.refresh(service)
    
    pkg = ServicePackage(
        service_id=service.id,
        package_type="BASIC",
        name="Basic Package",
        description="3 minute highlight reel.",
        price=Decimal("5000.00"),
        delivery_time_days=7,
        revisions=3
    )
    db.add(pkg)
    db.commit()
    db.refresh(pkg)
    
    return service, pkg


# =============================================================================
# TEST MATRIX SECTIONS
# =============================================================================

def test_01_client_booking_creation_workflow():
    """TEST 1: Client books Freelancer A through service.
    Expected: Booking created, selected_freelancer_profile_id = A, freelancer_profile_id = None, status = REQUESTED."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)
        service, pkg = create_fixture_service(db, profile_a.id)

        client_token = get_token_for_user(client_user)
        headers = {"Authorization": f"Bearer {client_token}"}

        booking_payload = {
            "service_id": service.id,
            "service_package_id": pkg.id,
            "selected_freelancer_profile_id": profile_a.id,
            "booking_date": (date.today() + timedelta(days=5)).isoformat(),
            "notes": "Intake wedding shoot details"
        }

        # Submit request
        response = client.post("/api/v1/client/bookings", json=booking_payload, headers=headers)
        assert response.status_code == 201
        res_data = response.json()

        assert res_data["selected_freelancer_profile_id"] == profile_a.id
        assert res_data["freelancer_profile_id"] is None
        assert res_data["status"] == "REQUESTED"
        assert res_data["agreed_amount"] == "5000.00"
        assert res_data["is_admin_managed"] is True


def test_02_new_booking_appears_in_admin_list():
    """TEST 2: New booking appears in Admin booking list."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)
        service, pkg = create_fixture_service(db, profile_a.id)
        admin_user = create_fixture_user(db, UserRole.ADMIN, "admin")

        client_token = get_token_for_user(client_user)
        admin_token = get_token_for_user(admin_user)

        booking_payload = {
            "service_id": service.id,
            "service_package_id": pkg.id,
            "booking_date": (date.today() + timedelta(days=5)).isoformat(),
        }

        # Create
        create_res = client.post("/api/v1/client/bookings", json=booking_payload, headers={"Authorization": f"Bearer {client_token}"})
        assert create_res.status_code == 201
        booking_id = create_res.json()["id"]

        # List Admin bookings
        admin_res = client.get("/api/v1/admin/bookings", headers={"Authorization": f"Bearer {admin_token}"})
        assert admin_res.status_code == 200
        admin_list = admin_res.json()
        
        # Verify our booking is visible in list
        booking_ids = [b["id"] for b in admin_list]
        assert booking_id in booking_ids


def test_03_client_admin_conversation_created():
    """TEST 3: Client/Admin conversation created. Participants: Client, Admin, Freelancer absent."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)
        service, pkg = create_fixture_service(db, profile_a.id)

        client_token = get_token_for_user(client_user)
        create_res = client.post("/api/v1/client/bookings", json={"service_id": service.id, "service_package_id": pkg.id, "booking_date": (date.today() + timedelta(days=5)).isoformat()}, headers={"Authorization": f"Bearer {client_token}"})
        assert create_res.status_code == 201
        booking_id = create_res.json()["id"]

        # Query conversations for this client
        convo_res = client.get("/api/v1/client/messages/conversations", headers={"Authorization": f"Bearer {client_token}"})
        assert convo_res.status_code == 200
        convos = convo_res.json()
        
        # Verify CLIENT_ADMIN conversation is linked to booking
        booking_convo = [c for c in convos if c["booking_id"] == booking_id]
        assert len(booking_convo) == 1
        convo = booking_convo[0]
        assert convo["conversation_type"] == "CLIENT_ADMIN"
        
        # Verify participants via API detail endpoint
        detail_res = client.get(f"/api/v1/messages/conversations/{convo['id']}", headers={"Authorization": f"Bearer {client_token}"})
        assert detail_res.status_code == 200
        detail_data = detail_res.json()
        user_ids = [p["user_id"] for p in detail_data["participants"]]
        assert client_user.id in user_ids
        assert freelancer_user.id not in user_ids


def test_04_no_client_freelancer_direct_conversation():
    """TEST 4: No Client/Freelancer direct conversation created."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)
        service, pkg = create_fixture_service(db, profile_a.id)

        client_token = get_token_for_user(client_user)
        client.post("/api/v1/client/bookings", json={"service_id": service.id, "service_package_id": pkg.id, "booking_date": (date.today() + timedelta(days=5)).isoformat()}, headers={"Authorization": f"Bearer {client_token}"})

        # Query ALL conversations in the database
        db_convos = db.query(Conversation).all()
        # Verify no DIRECT_LEGACY conversation exists between client and freelancer
        for c in db_convos:
            if c.conversation_type == "DIRECT_LEGACY":
                # Ensure they are not client and freelancer
                participants = db.query(ConversationParticipant).filter(ConversationParticipant.conversation_id == c.id).all()
                p_ids = [p.user_id for p in participants]
                assert not (client_user.id in p_ids and freelancer_user.id in p_ids)


def test_05_freelancer_cannot_see_booking_before_assignment():
    """TEST 5: Freelancer A cannot see booking before Admin assigns it."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)
        service, pkg = create_fixture_service(db, profile_a.id)

        client_token = get_token_for_user(client_user)
        create_res = client.post("/api/v1/client/bookings", json={"service_id": service.id, "service_package_id": pkg.id, "booking_date": (date.today() + timedelta(days=5)).isoformat()}, headers={"Authorization": f"Bearer {client_token}"})
        booking_id = create_res.json()["id"]

        freelancer_token = get_token_for_user(freelancer_user)
        headers = {"Authorization": f"Bearer {freelancer_token}"}

        # Check detail GET (should be 403 Forbidden)
        get_res = client.get(f"/api/v1/bookings/{booking_id}", headers=headers)
        assert get_res.status_code == 403

        # Check listing GET (should not list it)
        list_res = client.get("/api/v1/bookings", headers=headers)
        assert list_res.status_code == 200
        booking_ids = [b["id"] for b in list_res.json()]
        assert booking_id not in booking_ids


def test_06_no_freelancer_notification_at_creation():
    """TEST 6: No Freelancer assignment notification created yet."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)
        service, pkg = create_fixture_service(db, profile_a.id)

        client_token = get_token_for_user(client_user)
        client.post("/api/v1/client/bookings", json={"service_id": service.id, "service_package_id": pkg.id, "booking_date": (date.today() + timedelta(days=5)).isoformat()}, headers={"Authorization": f"Bearer {client_token}"})

        freelancer_token = get_token_for_user(freelancer_user)
        notif_res = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {freelancer_token}"})
        assert notif_res.status_code == 200
        for n in notif_res.json():
            assert n["event_code"] not in ["BOOKING_ASSIGNED", "FREELANCER_ASSIGNED"]


def test_07_admin_receives_booking_notification():
    """TEST 7: Admin receives booking notification."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)
        service, pkg = create_fixture_service(db, profile_a.id)
        from sqlalchemy import or_
        admin_user = db.query(User).filter(
            or_(User.role == UserRole.ADMIN, User.role == "ADMIN"),
            User.is_active == True
        ).first()
        if not admin_user:
            admin_user = create_fixture_user(db, UserRole.ADMIN, "admin")

        from app.services.admin_messaging_service import AdminMessagingService
        resolved_admin = AdminMessagingService._get_default_admin(db)

        client_token = get_token_for_user(client_user)
        client.post("/api/v1/client/bookings", json={"service_id": service.id, "service_package_id": pkg.id, "booking_date": (date.today() + timedelta(days=5)).isoformat()}, headers={"Authorization": f"Bearer {client_token}"})

        admin_token = get_token_for_user(resolved_admin)
        notif_res = client.get("/api/v1/notifications", headers={"Authorization": f"Bearer {admin_token}"})
        assert notif_res.status_code == 200
        booking_notifs = [n for n in notif_res.json() if n["event_code"] == "BOOKING_REQUESTED"]
        assert len(booking_notifs) >= 1
        assert "submitted a new booking request" in booking_notifs[0]["message"]


def test_08_client_sees_booking_in_own_list():
    """TEST 8: Client sees booking in own booking list."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)
        service, pkg = create_fixture_service(db, profile_a.id)

        client_token = get_token_for_user(client_user)
        headers = {"Authorization": f"Bearer {client_token}"}
        create_res = client.post("/api/v1/client/bookings", json={"service_id": service.id, "service_package_id": pkg.id, "booking_date": (date.today() + timedelta(days=5)).isoformat()}, headers=headers)
        booking_id = create_res.json()["id"]

        list_res = client.get("/api/v1/client/bookings", headers=headers)
        assert list_res.status_code == 200
        booking_ids = [b["id"] for b in list_res.json()]
        assert booking_id in booking_ids


def test_09_client_booking_detail_mapping():
    """TEST 9: Client booking detail correctly shows selected Freelancer = A, assigned Freelancer = none, status = Awaiting Admin Review equivalent."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)
        service, pkg = create_fixture_service(db, profile_a.id)

        client_token = get_token_for_user(client_user)
        headers = {"Authorization": f"Bearer {client_token}"}
        create_res = client.post("/api/v1/client/bookings", json={"service_id": service.id, "service_package_id": pkg.id, "booking_date": (date.today() + timedelta(days=5)).isoformat()}, headers=headers)
        booking_id = create_res.json()["id"]

        detail_res = client.get(f"/api/v1/bookings/{booking_id}", headers=headers)
        assert detail_res.status_code == 200
        detail = detail_res.json()

        assert detail["selected_freelancer"]["id"] == profile_a.id
        assert detail["freelancer"] is None
        assert detail["status"] == "REQUESTED"
        assert detail["conversation_id"] is not None


def test_10_unauthorized_client_blocked():
    """TEST 10: Another Client tries reading booking."""
    with SessionLocal() as db:
        client_user1 = create_fixture_user(db, UserRole.CLIENT, "client1")
        client_user2 = create_fixture_user(db, UserRole.CLIENT, "client2")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)
        service, pkg = create_fixture_service(db, profile_a.id)

        token1 = get_token_for_user(client_user1)
        token2 = get_token_for_user(client_user2)

        create_res = client.post("/api/v1/client/bookings", json={"service_id": service.id, "service_package_id": pkg.id, "booking_date": (date.today() + timedelta(days=5)).isoformat()}, headers={"Authorization": f"Bearer {token1}"})
        booking_id = create_res.json()["id"]

        # Read as client2
        read_res = client.get(f"/api/v1/bookings/{booking_id}", headers={"Authorization": f"Bearer {token2}"})
        assert read_res.status_code == 403


def test_11_invalid_freelancer_profile_validation():
    """TEST 11: Invalid Freelancer profile."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        client_token = get_token_for_user(client_user)

        payload = {
            "selected_freelancer_profile_id": 999999,
            "booking_date": (date.today() + timedelta(days=5)).isoformat(),
            "requirement_description": "Direct custom videography",
            "budget": 8000.00
        }
        res = client.post("/api/v1/client/bookings", json=payload, headers={"Authorization": f"Bearer {client_token}"})
        assert res.status_code == 404
        assert "freelancer profile not found" in res.json()["detail"].lower()


def test_12_inactive_freelancer_rejected():
    """TEST 12: Inactive Freelancer."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer", is_active=False)
        profile_a = create_fixture_profile(db, freelancer_user)

        client_token = get_token_for_user(client_user)

        payload = {
            "selected_freelancer_profile_id": profile_a.id,
            "booking_date": (date.today() + timedelta(days=5)).isoformat(),
            "requirement_description": "Direct custom videography",
            "budget": 8000.00
        }
        res = client.post("/api/v1/client/bookings", json=payload, headers={"Authorization": f"Bearer {client_token}"})
        assert res.status_code == 400
        assert "inactive" in res.json()["detail"].lower()


def test_13_client_selects_non_freelancer_user():
    """TEST 13: Client tries selecting non-Freelancer user."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        other_client = create_fixture_user(db, UserRole.CLIENT, "other_client")
        # Manually create profile for non-freelancer role to bypass standard creations
        profile_invalid = FreelancerProfile(
            user_id=other_client.id,
            primary_profession=FreelancerProfession.CINEMATOGRAPHER,
            is_profile_public=True
        )
        db.add(profile_invalid)
        db.commit()
        db.refresh(profile_invalid)

        client_token = get_token_for_user(client_user)

        payload = {
            "selected_freelancer_profile_id": profile_invalid.id,
            "booking_date": (date.today() + timedelta(days=5)).isoformat(),
            "requirement_description": "Direct custom videography",
            "budget": 8000.00
        }
        res = client.post("/api/v1/client/bookings", json=payload, headers={"Authorization": f"Bearer {client_token}"})
        assert res.status_code == 400
        assert "not a freelancer" in res.json()["detail"].lower()


def test_14_service_belongs_to_another_freelancer():
    """TEST 14: Service belongs to Freelancer B but Client submits selected Freelancer A."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_a = create_fixture_user(db, UserRole.FREELANCER, "free_a")
        freelancer_b = create_fixture_user(db, UserRole.FREELANCER, "free_b")
        profile_a = create_fixture_profile(db, freelancer_a)
        profile_b = create_fixture_profile(db, freelancer_b)
        service_b, pkg_b = create_fixture_service(db, profile_b.id)

        client_token = get_token_for_user(client_user)

        payload = {
            "service_id": service_b.id,
            "service_package_id": pkg_b.id,
            "selected_freelancer_profile_id": profile_a.id,
            "booking_date": (date.today() + timedelta(days=5)).isoformat(),
        }
        res = client.post("/api/v1/client/bookings", json=payload, headers={"Authorization": f"Bearer {client_token}"})
        assert res.status_code == 400
        assert "does not belong" in res.json()["detail"].lower()


def test_15_admin_reviews_booking():
    """TEST 15: Admin reviews booking through Step 3B."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)
        service, pkg = create_fixture_service(db, profile_a.id)
        admin_user = create_fixture_user(db, UserRole.ADMIN, "admin")

        client_token = get_token_for_user(client_user)
        admin_token = get_token_for_user(admin_user)

        # Create
        create_res = client.post("/api/v1/client/bookings", json={"service_id": service.id, "service_package_id": pkg.id, "booking_date": (date.today() + timedelta(days=5)).isoformat()}, headers={"Authorization": f"Bearer {client_token}"})
        booking_id = create_res.json()["id"]

        # Review
        review_res = client.post(f"/api/v1/admin/bookings/{booking_id}/review", json={"admin_notes": "Validating specs"}, headers={"Authorization": f"Bearer {admin_token}"})
        assert review_res.status_code == 200
        assert review_res.json()["status"] == "MATCHING_IN_PROGRESS"


def test_16_admin_assigns_freelancer():
    """TEST 16: Admin assigns selected Freelancer A."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)
        service, pkg = create_fixture_service(db, profile_a.id)
        admin_user = create_fixture_user(db, UserRole.ADMIN, "admin")

        client_token = get_token_for_user(client_user)
        admin_token = get_token_for_user(admin_user)

        # Create
        create_res = client.post("/api/v1/client/bookings", json={"service_id": service.id, "service_package_id": pkg.id, "booking_date": (date.today() + timedelta(days=5)).isoformat()}, headers={"Authorization": f"Bearer {client_token}"})
        booking_id = create_res.json()["id"]

        # Review
        client.post(f"/api/v1/admin/bookings/{booking_id}/review", json={"admin_notes": "Reviewed"}, headers={"Authorization": f"Bearer {admin_token}"})

        # Assign Freelancer A
        assign_res = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_a.id, "offered_payout_amount": 4000.0},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert assign_res.status_code == 200
        assert assign_res.json()["status"] == "OFFERED"
        assert assign_res.json()["freelancer_profile_id"] == profile_a.id


def test_17_freelancer_sees_assignment_after_assign():
    """TEST 17: Freelancer A now sees assignment only after Admin assignment."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)
        service, pkg = create_fixture_service(db, profile_a.id)
        admin_user = create_fixture_user(db, UserRole.ADMIN, "admin")

        client_token = get_token_for_user(client_user)
        admin_token = get_token_for_user(admin_user)
        freelancer_token = get_token_for_user(freelancer_user)

        # Create
        create_res = client.post("/api/v1/client/bookings", json={"service_id": service.id, "service_package_id": pkg.id, "booking_date": (date.today() + timedelta(days=5)).isoformat()}, headers={"Authorization": f"Bearer {client_token}"})
        booking_id = create_res.json()["id"]

        # Check freelancer assignments (should be empty)
        list_res = client.get("/api/v1/freelancer/assignments", headers={"Authorization": f"Bearer {freelancer_token}"})
        assert list_res.status_code == 200
        assert len(list_res.json()) == 0

        # Review & Assign
        client.post(f"/api/v1/admin/bookings/{booking_id}/review", json={"admin_notes": "Reviewed"}, headers={"Authorization": f"Bearer {admin_token}"})
        client.post(f"/api/v1/admin/bookings/{booking_id}/assign", json={"freelancer_profile_id": profile_a.id, "offered_payout_amount": 4000.0}, headers={"Authorization": f"Bearer {admin_token}"})

        # Check freelancer assignments again
        list_res2 = client.get("/api/v1/freelancer/assignments", headers={"Authorization": f"Bearer {freelancer_token}"})
        assert list_res2.status_code == 200
        assert len(list_res2.json()) == 1
        assert list_res2.json()[0]["booking_id"] == booking_id


def test_18_freelancer_accepts_assignment_finalizes():
    """TEST 18: Freelancer accepts assignment."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)
        service, pkg = create_fixture_service(db, profile_a.id)
        admin_user = create_fixture_user(db, UserRole.ADMIN, "admin")

        client_token = get_token_for_user(client_user)
        admin_token = get_token_for_user(admin_user)
        freelancer_token = get_token_for_user(freelancer_user)

        # Create
        create_res = client.post("/api/v1/client/bookings", json={"service_id": service.id, "service_package_id": pkg.id, "booking_date": (date.today() + timedelta(days=5)).isoformat()}, headers={"Authorization": f"Bearer {client_token}"})
        booking_id = create_res.json()["id"]

        # Review & Assign
        client.post(f"/api/v1/admin/bookings/{booking_id}/review", json={"admin_notes": "Reviewed"}, headers={"Authorization": f"Bearer {admin_token}"})
        assign_res = client.post(f"/api/v1/admin/bookings/{booking_id}/assign", json={"freelancer_profile_id": profile_a.id, "offered_payout_amount": 4000.0}, headers={"Authorization": f"Bearer {admin_token}"})
        assignment_id = assign_res.json()["id"]

        # Accept
        accept_res = client.post(f"/api/v1/freelancer/assignments/{assignment_id}/accept", headers={"Authorization": f"Bearer {freelancer_token}"})
        assert accept_res.status_code == 200
        assert accept_res.json()["status"] == "ACCEPTED"

        # Check booking is CONFIRMED and freelancer is assigned
        detail_res = client.get(f"/api/v1/bookings/{booking_id}", headers={"Authorization": f"Bearer {client_token}"})
        assert detail_res.json()["status"] == "CONFIRMED"
        assert detail_res.json()["freelancer_profile_id"] == profile_a.id


def test_19_legacy_direct_booking_loads_cleanly():
    """TEST 19: Legacy direct booking still loads."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)

        ts = int(datetime.utcnow().timestamp() * 1000) % 10000000
        legacy_booking = Booking(
            booking_number=f"LEGACY-{ts}",
            client_id=client_user.id,
            freelancer_profile_id=profile_a.id,
            selected_freelancer_profile_id=None,
            is_admin_managed=False,
            source_type=BookingSourceType.SERVICE,
            title="Old Direct Video",
            booking_type="REMOTE",
            status=BookingStatus.CONFIRMED,
            scheduled_date=date(2025, 1, 1),
            timezone="Asia/Kolkata",
            agreed_amount=Decimal("3000.00"),
            price=Decimal("3000.00"),
            deposit_amount=Decimal("900.00"),
            deposit_paid_amount=Decimal("900.00"),
            remaining_balance=Decimal("2100.00"),
            total_paid=Decimal("900.00"),
            payment_completion_state="PARTIALLY_PAID"
        )
        db.add(legacy_booking)
        db.commit()
        db.refresh(legacy_booking)

        client_token = get_token_for_user(client_user)

        try:
            # Retrieve detail
            res = client.get(f"/api/v1/bookings/{legacy_booking.id}", headers={"Authorization": f"Bearer {client_token}"})
            assert res.status_code == 200
            assert res.json()["is_admin_managed"] is False
            assert res.json()["freelancer_profile_id"] == profile_a.id
            assert res.json()["selected_freelancer_profile_id"] is None
        finally:
            db.delete(legacy_booking)
            db.commit()


def test_20_proposal_created_booking_loads():
    """TEST 20: Existing proposal-created legacy booking still loads."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)

        ts = int(datetime.utcnow().timestamp() * 1000) % 10000000
        legacy_booking = Booking(
            booking_number=f"PROJECT-{ts}",
            client_id=client_user.id,
            freelancer_profile_id=profile_a.id,
            selected_freelancer_profile_id=None,
            is_admin_managed=False,
            source_type=BookingSourceType.PROJECT,
            title="Project Milestone Video Shoot",
            booking_type="ON_SITE",
            status=BookingStatus.CONFIRMED,
            scheduled_date=date(2025, 2, 1),
            timezone="Asia/Kolkata",
            agreed_amount=Decimal("15000.00"),
            price=Decimal("15000.00"),
            deposit_amount=Decimal("4500.00"),
            deposit_paid_amount=Decimal("4500.00"),
            remaining_balance=Decimal("10500.00"),
            total_paid=Decimal("4500.00"),
            payment_completion_state="PARTIALLY_PAID"
        )
        db.add(legacy_booking)
        db.commit()
        db.refresh(legacy_booking)

        client_token = get_token_for_user(client_user)

        try:
            res = client.get(f"/api/v1/bookings/{legacy_booking.id}", headers={"Authorization": f"Bearer {client_token}"})
            assert res.status_code == 200
            assert res.json()["source_type"] == "PROJECT"
            assert res.json()["freelancer_profile_id"] == profile_a.id
        finally:
            db.delete(legacy_booking)
            db.commit()


def test_21_duplicate_booking_protection():
    """TEST 21: Duplicate booking submission protection (fails on multiple requests in 30s)."""
    with SessionLocal() as db:
        client_user = create_fixture_user(db, UserRole.CLIENT, "client")
        freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "freelancer")
        profile_a = create_fixture_profile(db, freelancer_user)

        client_token = get_token_for_user(client_user)
        headers = {"Authorization": f"Bearer {client_token}"}

        payload = {
            "selected_freelancer_profile_id": profile_a.id,
            "booking_date": (date.today() + timedelta(days=10)).isoformat(),
            "requirement_description": "Direct custom videography",
            "budget": 8000.00
        }

        # First request succeeds
        res1 = client.post("/api/v1/client/bookings", json=payload, headers=headers)
        assert res1.status_code == 201

        # Second request within 30s fails with 409 Conflict
        res2 = client.post("/api/v1/client/bookings", json=payload, headers=headers)
        assert res2.status_code == 409
        assert "similar booking request was recently submitted" in res2.json()["detail"].lower()
