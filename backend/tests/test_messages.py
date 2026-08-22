import pytest
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, VerificationStatus
from app.models.booking import Booking, BookingStatus, BookingSourceType
from app.core.security import create_token


def create_test_user(db_session, email: str, role: UserRole) -> User:
    username = email.split("@")[0]
    user = User(
        full_name="Test User",
        email=email,
        phone=f"9876543{username}"[:20],
        password_hash="hashedpassword",
        role=role,
        is_active=True,
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


def create_freelancer_profile(db_session, user_id: int) -> FreelancerProfile:
    profile = FreelancerProfile(
        user_id=user_id,
        primary_profession="PHOTOGRAPHER",
        professional_title="Creative Professional",
        bio="Test Bio that is long enough to satisfy basic validations and completeness.",
        city="Mumbai",
        state="Maharashtra",
        country="India",
        service_radius_km=30,
        willing_to_travel=True,
        starting_price=1000.0,
        is_profile_public=True,
        verification_status=VerificationStatus.VERIFIED
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)
    return profile


def create_test_booking(db_session, client_id: int, freelancer_profile_id: int) -> Booking:
    booking = Booking(
        booking_number="B-TEST-MESSAGES",
        client_id=client_id,
        freelancer_profile_id=freelancer_profile_id,
        source_type=BookingSourceType.SERVICE,
        booking_type="ON_VENUE",
        status=BookingStatus.REQUESTED,
        title="Test Event Booking",
        scheduled_date=None,
        booking_date=None,
        timezone="Asia/Kolkata",
        agreed_amount=5000.0,
        currency="INR",
        price=5000.0,
        deposit_amount=1000.0,
        deposit_paid_amount=0.0,
        remaining_balance=4000.0,
        total_paid=0.0,
        payment_completion_state="UNPAID",
    )
    db_session.add(booking)
    db_session.commit()
    db_session.refresh(booking)
    return booking


def test_freelancer_starts_chat_with_client_success(client, db):
    # Setup users
    freelancer = create_test_user(db, "free@example.com", UserRole.FREELANCER)
    profile = create_freelancer_profile(db, freelancer.id)
    client_user = create_test_user(db, "client@example.com", UserRole.CLIENT)
    
    # Active booking exists between client and freelancer
    create_test_booking(db, client_user.id, profile.id)

    free_token = create_token(freelancer.id, "access", role="FREELANCER")

    # Post to create conversation with client_id
    res = client.post(
        "/api/v1/messages/conversations",
        json={"client_id": client_user.id},
        headers={"Authorization": f"Bearer {free_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["client_id"] == client_user.id
    assert data["freelancer_id"] == freelancer.id


def test_freelancer_starts_chat_with_client_self_protection(client, db):
    # Setup freelancer
    freelancer = create_test_user(db, "free@example.com", UserRole.FREELANCER)
    create_freelancer_profile(db, freelancer.id)

    free_token = create_token(freelancer.id, "access", role="FREELANCER")

    # Self-messaging should yield 400 Bad Request
    res = client.post(
        "/api/v1/messages/conversations",
        json={"client_id": freelancer.id},
        headers={"Authorization": f"Bearer {free_token}"},
    )
    assert res.status_code == 400
    assert res.json()["detail"] == "You cannot start a conversation with yourself"


def test_freelancer_starts_chat_with_client_unauthorized(client, db):
    # Setup users
    freelancer = create_test_user(db, "free@example.com", UserRole.FREELANCER)
    create_freelancer_profile(db, freelancer.id)
    unrelated_client = create_test_user(db, "unrelated@example.com", UserRole.CLIENT)

    free_token = create_token(freelancer.id, "access", role="FREELANCER")

    # Access without booking or proposal should fail with 403 Forbidden
    res = client.post(
        "/api/v1/messages/conversations",
        json={"client_id": unrelated_client.id},
        headers={"Authorization": f"Bearer {free_token}"},
    )
    assert res.status_code == 403
    assert "active booking or proposal" in res.json()["detail"]


def test_client_starts_chat_with_freelancer_success(client, db):
    # Setup users
    freelancer = create_test_user(db, "free@example.com", UserRole.FREELANCER)
    profile = create_freelancer_profile(db, freelancer.id)
    client_user = create_test_user(db, "client@example.com", UserRole.CLIENT)
    
    # Active booking exists
    create_test_booking(db, client_user.id, profile.id)

    client_token = create_token(client_user.id, "access", role="CLIENT")

    # Legacy client-initiated endpoint usage
    res = client.post(
        "/api/v1/messages/conversations",
        json={"freelancer_id": profile.id},
        headers={"Authorization": f"Bearer {client_token}"},
    )
    assert res.status_code == 200
    data = res.json()
    assert data["client_id"] == client_user.id
    assert data["freelancer_id"] == freelancer.id
