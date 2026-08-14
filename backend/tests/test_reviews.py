import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession, VerificationStatus
from app.models.service import Service, ServiceStatus, ServiceType
from app.models.booking import Booking, BookingStatus, BookingSourceType
from app.models.review import Review, ReviewStatus
from app.models.review_response import ReviewResponse
from app.models.favourite import FavouriteFreelancer, FavouriteService
from app.models.trust_badge import TrustBadge, FreelancerBadge
from app.core.security import get_password_hash, create_token
from app.services.trust_service import TrustService


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
    # Create another client user for security tests
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
        bio="Experienced creative photographer with an extensive wedding photography portfolio.",
        experience_years=5,
        city="Mumbai",
        state="Maharashtra",
        country="India",
        starting_price=Decimal("15000.00"),
        is_profile_public=True,
        profile_completion_percentage=100,
        verification_status=VerificationStatus.VERIFIED
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@pytest.fixture
def service(db: Session, freelancer_profile):
    srv = Service(
        freelancer_profile_id=freelancer_profile.id,
        title="Wedding Photography Pack",
        slug="wedding-photography-pack",
        short_description="Full day coverage",
        description="Premium wedding photography package",
        service_type=ServiceType.ON_SITE,
        starting_price=Decimal("15000.00"),
        status=ServiceStatus.PUBLISHED
    )
    db.add(srv)
    db.commit()
    db.refresh(srv)
    return srv


@pytest.fixture
def client_headers(test_users):
    token = create_token(test_users["client"].id, "access", role="CLIENT")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def other_client_headers(test_users):
    token = create_token(test_users["other_client"].id, "access", role="CLIENT")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def freelancer_headers(test_users):
    token = create_token(test_users["freelancer"].id, "access", role="FREELANCER")
    return {"Authorization": f"Bearer {token}"}


# --- TESTS ---

def test_create_review_flow(client: TestClient, db: Session, test_users, freelancer_profile, service, client_headers):
    # 1. Create a completed booking
    booking = Booking(
        booking_number="B-100",
        client_id=test_users["client"].id,
        freelancer_profile_id=freelancer_profile.id,
        service_id=service.id,
        status=BookingStatus.COMPLETED,
        agreed_amount=Decimal("15000.00"),
        price=Decimal("15000.00")
    )
    db.add(booking)
    db.commit()

    payload = {
        "overall_rating": 5,
        "quality_rating": 5,
        "communication_rating": 4,
        "professionalism_rating": 5,
        "timeliness_rating": 5,
        "value_rating": 5,
        "title": "Excellent wedding photography",
        "comment": "The Aarav and his team was professional and delivered excellent work."
    }

    # Post review
    response = client.post(f"/api/v1/client/bookings/{booking.id}/review", json=payload, headers=client_headers)
    assert response.status_code == 201
    data = response.json()
    assert data["overall_rating"] == 5
    assert data["is_verified_booking"] is True
    assert data["comment"] == payload["comment"]

    # Verify aggregates recalculated
    db.refresh(freelancer_profile)
    db.refresh(service)
    assert freelancer_profile.average_rating == 5.0
    assert freelancer_profile.review_count == 1
    assert freelancer_profile.completed_jobs_count == 1
    assert service.average_rating == 5.0
    assert service.review_count == 1

    # Verify trust badges evaluated
    db.refresh(freelancer_profile)
    badges = [fb.badge.code for fb in freelancer_profile.badges if fb.is_active]
    assert "EMAIL_VERIFIED" in badges
    assert "PHONE_VERIFIED" in badges


def test_create_review_invalid_cases(client: TestClient, db: Session, test_users, freelancer_profile, service, client_headers, other_client_headers):
    # 1. Booking not completed
    booking_incomplete = Booking(
        booking_number="B-200",
        client_id=test_users["client"].id,
        freelancer_profile_id=freelancer_profile.id,
        service_id=service.id,
        status=BookingStatus.CONFIRMED,
        agreed_amount=Decimal("15000.00"),
        price=Decimal("15000.00")
    )
    db.add(booking_incomplete)
    db.commit()

    payload = {
        "overall_rating": 5,
        "comment": "The Aarav and his team was professional and delivered excellent work."
    }

    response = client.post(f"/api/v1/client/bookings/{booking_incomplete.id}/review", json=payload, headers=client_headers)
    assert response.status_code == 400
    assert "completed bookings" in response.json()["detail"]

    # 2. Try to review other client's booking
    booking_completed = Booking(
        booking_number="B-300",
        client_id=test_users["client"].id,
        freelancer_profile_id=freelancer_profile.id,
        service_id=service.id,
        status=BookingStatus.COMPLETED,
        agreed_amount=Decimal("15000.00"),
        price=Decimal("15000.00")
    )
    db.add(booking_completed)
    db.commit()

    response = client.post(f"/api/v1/client/bookings/{booking_completed.id}/review", json=payload, headers=other_client_headers)
    assert response.status_code == 403
    assert "do not own" in response.json()["detail"]

    # 3. Duplicate review protection
    response = client.post(f"/api/v1/client/bookings/{booking_completed.id}/review", json=payload, headers=client_headers)
    assert response.status_code == 201

    response_duplicate = client.post(f"/api/v1/client/bookings/{booking_completed.id}/review", json=payload, headers=client_headers)
    assert response_duplicate.status_code == 400
    assert "already been submitted" in response_duplicate.json()["detail"]


def test_edit_and_soft_delete_review(client: TestClient, db: Session, test_users, freelancer_profile, service, client_headers, other_client_headers):
    booking = Booking(
        booking_number="B-400",
        client_id=test_users["client"].id,
        freelancer_profile_id=freelancer_profile.id,
        service_id=service.id,
        status=BookingStatus.COMPLETED,
        agreed_amount=Decimal("15000.00"),
        price=Decimal("15000.00")
    )
    db.add(booking)
    db.commit()

    payload = {
        "overall_rating": 4,
        "comment": "Nice photoshoot but took longer than expected to edit."
    }
    # Create review
    review = Review(
        booking_id=booking.id,
        client_id=test_users["client"].id,
        freelancer_profile_id=freelancer_profile.id,
        service_id=service.id,
        status=ReviewStatus.PUBLISHED,
        **payload
    )
    db.add(review)
    db.commit()

    # Edit review (success)
    edit_payload = {"overall_rating": 5, "comment": "Actually, the edit was fine. Updated experience."}
    response = client.patch(f"/api/v1/client/reviews/{review.id}", json=edit_payload, headers=client_headers)
    assert response.status_code == 200
    assert response.json()["overall_rating"] == 5
    assert response.json()["comment"] == edit_payload["comment"]

    # Edit review (unauthorized client)
    response_unauth = client.patch(f"/api/v1/client/reviews/{review.id}", json=edit_payload, headers=other_client_headers)
    assert response_unauth.status_code == 403

    # Delete review (success)
    delete_response = client.delete(f"/api/v1/client/reviews/{review.id}", headers=client_headers)
    assert delete_response.status_code == 204

    # Verify status is soft-deleted to REMOVED
    db.refresh(review)
    assert review.status == ReviewStatus.REMOVED


def test_freelancer_response(client: TestClient, db: Session, test_users, freelancer_profile, service, client_headers, freelancer_headers):
    booking = Booking(
        booking_number="B-500",
        client_id=test_users["client"].id,
        freelancer_profile_id=freelancer_profile.id,
        service_id=service.id,
        status=BookingStatus.COMPLETED,
        agreed_amount=Decimal("15000.00"),
        price=Decimal("15000.00")
    )
    db.add(booking)
    db.commit()

    review = Review(
        booking_id=booking.id,
        client_id=test_users["client"].id,
        freelancer_profile_id=freelancer_profile.id,
        service_id=service.id,
        status=ReviewStatus.PUBLISHED,
        overall_rating=5,
        comment="Absolutely stunning photos of my wedding."
    )
    db.add(review)
    db.commit()

    # Response creation (success)
    payload = {"response": "Thank you for choosing Aarav Sharma Photography. Pleasure working with you!"}
    resp = client.post(f"/api/v1/freelancer/reviews/{review.id}/response", json=payload, headers=freelancer_headers)
    assert resp.status_code == 201
    assert resp.json()["response"] == payload["response"]

    # Response edit (success)
    edit_payload = {"response": "Thank you for choosing us! We hope to work with you again!"}
    resp_edit = client.patch(f"/api/v1/freelancer/reviews/{review.id}/response", json=edit_payload, headers=freelancer_headers)
    assert resp_edit.status_code == 200
    assert resp_edit.json()["response"] == edit_payload["response"]

    # Response edit unauthorized client
    resp_unauth = client.post(f"/api/v1/freelancer/reviews/{review.id}/response", json=payload, headers=client_headers)
    assert resp_unauth.status_code == 403


def test_favourites_system(client: TestClient, db: Session, test_users, freelancer_profile, service, client_headers):
    # 1. Favorite Freelancer
    response = client.post(f"/api/v1/client/favourites/freelancers/{freelancer_profile.id}", headers=client_headers)
    assert response.status_code == 201

    # Try duplicate favorite
    response_dup = client.post(f"/api/v1/client/favourites/freelancers/{freelancer_profile.id}", headers=client_headers)
    assert response_dup.status_code == 201

    # List favorites
    list_resp = client.get("/api/v1/client/favourites/freelancers", headers=client_headers)
    assert list_resp.status_code == 200
    assert len(list_resp.json()) == 1
    assert list_resp.json()[0]["full_name"] == "Aarav Sharma"

    # Remove favorite
    del_resp = client.delete(f"/api/v1/client/favourites/freelancers/{freelancer_profile.id}", headers=client_headers)
    assert del_resp.status_code == 204

    # 2. Favorite Service
    response_srv = client.post(f"/api/v1/client/favourites/services/{service.id}", headers=client_headers)
    assert response_srv.status_code == 201

    list_srv = client.get("/api/v1/client/favourites/services", headers=client_headers)
    assert len(list_srv.json()) == 1

    del_srv = client.delete(f"/api/v1/client/favourites/services/{service.id}", headers=client_headers)
    assert del_srv.status_code == 204


def test_automatic_trust_badge_eligibility(client: TestClient, db: Session, test_users, freelancer_profile):
    # Seed badges
    TrustService.seed_badges_if_empty(db)

    # 1. Verify EMAIL & PHONE verification badge awarded
    TrustService.evaluate_freelancer_badges(db, freelancer_profile.id)
    db.refresh(freelancer_profile)

    badges = [fb.badge.code for fb in freelancer_profile.badges if fb.is_active]
    assert "EMAIL_VERIFIED" in badges
    assert "PHONE_VERIFIED" in badges
    assert "TOP_RATED" not in badges # Not enough completed bookings/reviews

    # 2. Test Rising Creator evaluation (completion >= 80%, completed bookings >= 3, average rating >= 4.5)
    # Simulate completed bookings
    for i in range(5):
        b = Booking(
            booking_number=f"B-AUTO-{i}",
            client_id=test_users["client"].id,
            freelancer_profile_id=freelancer_profile.id,
            status=BookingStatus.COMPLETED,
            agreed_amount=Decimal("5000.00"),
            price=Decimal("5000.00")
        )
        db.add(b)
    db.commit()

    # Simulate reviews
    for i in range(5):
        bk = db.query(Booking).filter(Booking.booking_number == f"B-AUTO-{i}").first()
        r = Review(
            booking_id=bk.id,
            client_id=test_users["client"].id,
            freelancer_profile_id=freelancer_profile.id,
            overall_rating=5,
            comment="Excellent quick services and great response time.",
            status=ReviewStatus.PUBLISHED
        )
        db.add(r)
    db.commit()

    # Recalculate and evaluate
    from app.services.rating_service import RatingService
    RatingService.recalculate_freelancer_aggregates(db, freelancer_profile.id)
    TrustService.evaluate_freelancer_badges(db, freelancer_profile.id)
    db.refresh(freelancer_profile)

    badges = [fb.badge.code for fb in freelancer_profile.badges if fb.is_active]
    assert "RISING_CREATOR" in badges
