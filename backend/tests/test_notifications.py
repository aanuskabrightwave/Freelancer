import pytest
from datetime import datetime, timedelta
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession, VerificationStatus
from app.models.service import Service, ServiceStatus, ServiceType
from app.models.service_package import ServicePackage, PackageType
from app.models.booking import Booking, BookingStatus, BookingSourceType
from app.models.notification import Notification, NotificationType
from app.models.notification_preferences import NotificationPreferences
from app.models.email_delivery import EmailDelivery
from app.core.security import get_password_hash, create_token
from app.services.notification_service import NotificationService
from app.services.email_service import EmailService


@pytest.fixture
def test_users(db: Session):
    # Create client user
    client = User(
        full_name="John Doe Client",
        email="john@example.com",
        phone="9876543210",
        password_hash=get_password_hash("password123"),
        role=UserRole.CLIENT,
        is_verified=True,
        is_phone_verified=True
    )
    # Create freelancer user
    freelancer = User(
        full_name="Aarav Sharma",
        email="aarav@example.com",
        phone="9876543211",
        password_hash=get_password_hash("password123"),
        role=UserRole.FREELANCER,
        is_verified=True,
        is_phone_verified=True
    )
    # Create another client user
    other_client = User(
        full_name="Other Client",
        email="other@example.com",
        phone="9876543212",
        password_hash=get_password_hash("password123"),
        role=UserRole.CLIENT,
        is_verified=True
    )
    db.add(client)
    db.add(freelancer)
    db.add(other_client)
    db.commit()
    db.refresh(client)
    db.refresh(freelancer)
    db.refresh(other_client)
    return {"client": client, "freelancer": freelancer, "other_client": other_client}


@pytest.fixture
def freelancer_profile(db: Session, test_users):
    profile = FreelancerProfile(
        user_id=test_users["freelancer"].id,
        professional_title="Creative Photographer",
        primary_profession=FreelancerProfession.PHOTOGRAPHER,
        bio="Experienced camera operator",
        experience_years=5,
        city="Mumbai",
        state="Maharashtra",
        country="India",
        is_profile_public=True,
        verification_status=VerificationStatus.VERIFIED,
        profile_completion_percentage=90
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@pytest.fixture
def service(db: Session, freelancer_profile):
    srv = Service(
        freelancer_profile_id=freelancer_profile.id,
        title="Wedding Photography",
        slug="wedding-photography",
        short_description="Capture precious moments",
        description="Full day shooting coverage",
        service_type=ServiceType.ON_SITE,
        starting_price=Decimal("15000.00"),
        status=ServiceStatus.PUBLISHED
    )
    db.add(srv)
    db.commit()
    db.refresh(srv)

    pkg = ServicePackage(
        service_id=srv.id,
        name="Standard Package",
        description="Standard photography coverage",
        price=Decimal("25000.00"),
        package_type=PackageType.STANDARD,
        revisions=2,
        delivery_time_days=5
    )
    db.add(pkg)
    db.commit()
    return srv


@pytest.fixture
def client_headers(test_users):
    client_token = create_token(test_users["client"].id, "access")
    return {"Authorization": f"Bearer {client_token}"}


@pytest.fixture
def freelancer_headers(test_users):
    freelancer_token = create_token(test_users["freelancer"].id, "access")
    return {"Authorization": f"Bearer {freelancer_token}"}


@pytest.fixture
def other_client_headers(test_users):
    other_token = create_token(test_users["other_client"].id, "access")
    return {"Authorization": f"Bearer {other_token}"}


def test_notification_dispatch_and_inbox(client: TestClient, db: Session, test_users, client_headers):
    user_id = test_users["client"].id
    
    # Trigger a manual dispatch
    n = NotificationService.dispatch(
        db=db,
        recipient_id=user_id,
        event_code="PROJECT_PUBLISHED",
        title="Project Published",
        message="Your Wedding Photography project is now live.",
        action_url="/client/projects/1"
    )
    assert n is not None
    assert n.user_id == user_id
    assert n.is_read is False

    # Retrieve inbox via endpoint
    response = client.get("/api/v1/notifications", headers=client_headers)
    assert response.status_code == 200
    res_data = response.json()
    assert len(res_data) >= 1
    assert res_data[0]["event_code"] == "PROJECT_PUBLISHED"

    # Get unread count
    cnt_resp = client.get("/api/v1/notifications/unread-count", headers=client_headers)
    assert cnt_resp.status_code == 200
    assert cnt_resp.json()["count"] == 1


def test_notification_ownership_protection(client: TestClient, db: Session, test_users, client_headers, other_client_headers):
    client_id = test_users["client"].id
    other_client_id = test_users["other_client"].id

    # Create notification for client
    n = NotificationService.dispatch(
        db=db,
        recipient_id=client_id,
        event_code="SYSTEM_ANNOUNCEMENT",
        title="Maintenance Scheduled",
        message="System will be down for 2 hours.",
        action_url="/announcements"
    )

    # 1. Other client list should not see it
    response = client.get("/api/v1/notifications", headers=other_client_headers)
    assert response.status_code == 200
    assert len(response.json()) == 0

    # 2. Other client try to mark read should fail
    read_resp = client.post(f"/api/v1/notifications/{n.id}/read", headers=other_client_headers)
    assert read_resp.status_code == 404


def test_notification_read_operations(client: TestClient, db: Session, test_users, client_headers):
    client_id = test_users["client"].id

    # Create notifications
    n1 = NotificationService.dispatch(db=db, recipient_id=client_id, event_code="SYSTEM_ANNOUNCEMENT", title="1", message="1")
    n2 = NotificationService.dispatch(db=db, recipient_id=client_id, event_code="SYSTEM_ANNOUNCEMENT", title="2", message="2")

    # Mark single read
    response = client.post(f"/api/v1/notifications/{n1.id}/read", headers=client_headers)
    assert response.status_code == 200
    assert response.json()["is_read"] is True

    # Mark all read
    all_resp = client.post("/api/v1/notifications/read-all", headers=client_headers)
    assert all_resp.status_code == 204

    # Verify counts
    cnt_resp = client.get("/api/v1/notifications/unread-count", headers=client_headers)
    assert cnt_resp.json()["count"] == 0


def test_notification_preferences(client: TestClient, db: Session, test_users, client_headers):
    client_id = test_users["client"].id

    # 1. Get default settings
    response = client.get("/api/v1/notifications/preferences", headers=client_headers)
    assert response.status_code == 200
    prefs = response.json()
    assert prefs["email_enabled"] is True

    # 2. Update toggle preferences
    update_payload = {
        "email_enabled": False,
        "booking_updates_email": False
    }
    patch_resp = client.patch("/api/v1/notifications/preferences", json=update_payload, headers=client_headers)
    assert patch_resp.status_code == 200
    updated_prefs = patch_resp.json()
    assert updated_prefs["email_enabled"] is False
    assert updated_prefs["booking_updates_email"] is False


def test_payment_deduplication_and_cooldown(db: Session, test_users):
    client_id = test_users["client"].id

    # 1. Test Deduplication key
    dup_key = "payment:pay_123:captured:client:8"
    n1 = NotificationService.dispatch(
        db=db, recipient_id=client_id, event_code="PAYMENT_SUCCESS",
        title="Captured", message="First", deduplication_key=dup_key
    )
    n2 = NotificationService.dispatch(
        db=db, recipient_id=client_id, event_code="PAYMENT_SUCCESS",
        title="Captured", message="Second", deduplication_key=dup_key
    )
    # The duplicate should return the same notification object and not create a duplicate row
    assert n1.id == n2.id

    # Verify rows in DB
    count = db.query(Notification).filter(Notification.deduplication_key == dup_key).count()
    assert count == 1

    # 2. Test Message email Cooldown
    # Dispatch MESSAGE_RECEIVED first time -> Creates email entry PENDING or SENT (in dev skipped is mock)
    # But wait, to check suppressions we dispatch MESSAGE_RECEIVED twice to the same user
    meta_payload = {"recipient_email": "john@example.com", "sender_name": "Aarav", "text_preview": "Hey"}
    
    # Ensure preferences enable message email
    NotificationService.update_preferences(db, client_id, {"email_enabled": True, "message_email": True})

    # First dispatch
    NotificationService.dispatch(
        db=db, recipient_id=client_id, event_code="MESSAGE_RECEIVED",
        title="New Msg", message="Hey", payload_meta=meta_payload
    )

    # Verify delivery record exists
    del1 = db.query(EmailDelivery).filter(
        EmailDelivery.user_id == client_id,
        EmailDelivery.template_code == "MESSAGE_RECEIVED"
    ).first()
    assert del1 is not None

    # Second dispatch immediately (should hit cooldown)
    NotificationService.dispatch(
        db=db, recipient_id=client_id, event_code="MESSAGE_RECEIVED",
        title="New Msg 2", message="Hey 2", payload_meta=meta_payload
    )

    # Verify that a skipped entry was recorded
    skipped_del = db.query(EmailDelivery).filter(
        EmailDelivery.user_id == client_id,
        EmailDelivery.template_code == "MESSAGE_RECEIVED",
        EmailDelivery.status == "SKIPPED"
    ).first()
    assert skipped_del is not None
    assert "skipped due to 15-minute rate limit" in skipped_del.failure_reason


def test_booking_and_review_dispatch_hooks(client: TestClient, db: Session, test_users, freelancer_profile, service, client_headers, freelancer_headers):
    # 1. Create booking (triggers BOOKING_REQUESTED to freelancer)
    booking = Booking(
        booking_number="B-777",
        client_id=test_users["client"].id,
        freelancer_profile_id=freelancer_profile.id,
        service_id=service.id,
        status=BookingStatus.COMPLETED,  # mark completed directly so we can test review hooks
        agreed_amount=Decimal("25000.00"),
        price=Decimal("25000.00")
    )
    db.add(booking)
    db.commit()

    # Submit review (triggers REVIEW_RECEIVED to freelancer)
    review_payload = {
        "overall_rating": 5,
        "comment": "Incredible work! The photographer was extremely creative and professional.",
        "quality_rating": 5,
        "communication_rating": 5,
        "timeliness_rating": 5,
        "value_rating": 5,
        "professionalism_rating": 5
    }
    rev_resp = client.post(f"/api/v1/client/bookings/{booking.id}/review", json=review_payload, headers=client_headers)
    assert rev_resp.status_code == 201
    review_id = rev_resp.json()["id"]

    # Verify review received notification in database for freelancer
    fl_notif = db.query(Notification).filter(
        Notification.user_id == test_users["freelancer"].id,
        Notification.event_code == "REVIEW_RECEIVED"
    ).first()
    assert fl_notif is not None
    assert "5-star review" in fl_notif.message

    # Freelancer reply (triggers REVIEW_RESPONSE_RECEIVED to client)
    reply_payload = {"response": "Thank you so much!"}
    reply_resp = client.post(f"/api/v1/freelancer/reviews/{review_id}/response", json=reply_payload, headers=freelancer_headers)
    assert reply_resp.status_code == 201

    # Verify review reply notification in database for client
    cl_notif = db.query(Notification).filter(
        Notification.user_id == test_users["client"].id,
        Notification.event_code == "REVIEW_RESPONSE_RECEIVED"
    ).first()
    assert cl_notif is not None
    assert "replied to your review" in cl_notif.message
