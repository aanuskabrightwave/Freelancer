import pytest
from decimal import Decimal
from app.models.user import User, UserRole
from app.models.project import Project, Proposal
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession
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


def create_test_freelancer_profile(db_session, user: User) -> FreelancerProfile:
    profile = FreelancerProfile(
        user_id=user.id,
        bio="Test creative bio details",
        experience_years=5,
        primary_profession=FreelancerProfession.VIDEOGRAPHER
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)
    return profile


def create_test_project(db_session, client_user: User) -> Project:
    project = Project(
        client_id=client_user.id,
        title="Videography Test Requirement",
        description="Detailed cinematic briefing description.",
        project_type="REMOTE",
        budget=35000.0,
        status="OPEN"
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)
    return project


def test_submit_proposal_success(client, db):
    # Setup roles
    client_user = create_test_user(db, "client_a@example.com", UserRole.CLIENT)
    freelancer = create_test_user(db, "free_a@example.com", UserRole.FREELANCER)
    profile = create_test_freelancer_profile(db, freelancer)
    project = create_test_project(db, client_user)

    free_token = create_token(freelancer.id, "access", role="FREELANCER")

    payload = {
        "proposed_amount": 27500.0,
        "delivery_days": 5,
        "cover_letter": "I have extensive videography experience to handle this."
    }

    res = client.post(
        f"/api/v1/projects/{project.id}/proposals",
        json=payload,
        headers={"Authorization": f"Bearer {free_token}"}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["status"] == "PENDING"
    assert Decimal(str(data["proposed_amount"])) == Decimal("27500.0")
    assert data["delivery_days"] == 5
    assert data["cover_letter"] == "I have extensive videography experience to handle this."

    # Verify database persistence
    db_prop = db.query(Proposal).filter(Proposal.id == data["id"]).first()
    assert db_prop is not None
    assert db_prop.status == "PENDING"


def test_submit_proposal_duplicate_blocked(client, db):
    client_user = create_test_user(db, "client_a@example.com", UserRole.CLIENT)
    freelancer = create_test_user(db, "free_a@example.com", UserRole.FREELANCER)
    profile = create_test_freelancer_profile(db, freelancer)
    project = create_test_project(db, client_user)

    free_token = create_token(freelancer.id, "access", role="FREELANCER")

    payload = {
        "proposed_amount": 25000.0,
        "delivery_days": 3,
        "cover_letter": "First proposal pitch letter."
    }

    # Submit first
    res1 = client.post(
        f"/api/v1/projects/{project.id}/proposals",
        json=payload,
        headers={"Authorization": f"Bearer {free_token}"}
    )
    assert res1.status_code == 201

    # Attempt second submission (duplicate block)
    res2 = client.post(
        f"/api/v1/projects/{project.id}/proposals",
        json=payload,
        headers={"Authorization": f"Bearer {free_token}"}
    )
    assert res2.status_code == 400
    assert "already submitted" in res2.json()["detail"].lower()


def test_withdraw_proposal(client, db):
    client_user = create_test_user(db, "client_a@example.com", UserRole.CLIENT)
    freelancer = create_test_user(db, "free_a@example.com", UserRole.FREELANCER)
    profile = create_test_freelancer_profile(db, freelancer)
    project = create_test_project(db, client_user)

    free_token = create_token(freelancer.id, "access", role="FREELANCER")

    # Submit proposal
    db_proposal = Proposal(
        project_id=project.id,
        freelancer_profile_id=profile.id,
        proposed_amount=Decimal("30000.00"),
        cover_letter="DAYS:7|Cover Letter Message Details",
        status="PENDING"
    )
    db.add(db_proposal)
    db.commit()

    # Withdraw proposal
    res = client.post(
        f"/api/v1/proposals/{db_proposal.id}/withdraw",
        headers={"Authorization": f"Bearer {free_token}"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "WITHDRAWN"

    # Verify db status is updated, not deleted
    db.refresh(db_proposal)
    assert db_proposal.status == "WITHDRAWN"


def test_accept_proposal_transaction(client, db):
    client_user = create_test_user(db, "client_a@example.com", UserRole.CLIENT)
    client_token = create_token(client_user.id, "access", role="CLIENT")

    # Freelancer A
    freelancer_a = create_test_user(db, "free_a@example.com", UserRole.FREELANCER)
    profile_a = create_test_freelancer_profile(db, freelancer_a)

    # Freelancer B
    freelancer_b = create_test_user(db, "free_b@example.com", UserRole.FREELANCER)
    profile_b = create_test_freelancer_profile(db, freelancer_b)

    project = create_test_project(db, client_user)

    # Create Proposal A (pending)
    prop_a = Proposal(
        project_id=project.id,
        freelancer_profile_id=profile_a.id,
        proposed_amount=Decimal("28000.00"),
        cover_letter="DAYS:10|Cover Letter A",
        status="PENDING"
    )
    db.add(prop_a)

    # Create Proposal B (pending)
    prop_b = Proposal(
        project_id=project.id,
        freelancer_profile_id=profile_b.id,
        proposed_amount=Decimal("32000.00"),
        cover_letter="DAYS:14|Cover Letter B",
        status="PENDING"
    )
    db.add(prop_b)
    db.commit()

    # Client accepts Proposal A
    payload = {
        "scheduled_date": "2026-09-30",
        "start_time": "09:00",
        "end_time": "17:00",
        "venue_name": "Test Studio",
        "venue_address": "123 Film Road",
        "city": "Mumbai",
        "state": "Maharashtra"
    }
    res = client.post(
        f"/api/v1/client/proposals/{prop_a.id}/accept",
        json=payload,
        headers={"Authorization": f"Bearer {client_token}"}
    )
    assert res.status_code == 201
    assert res.json()["status"] == "CONFIRMED"

    db.refresh(prop_a)
    db.refresh(prop_b)
    db.refresh(project)

    # Assert status synchronizations
    assert prop_a.status == "ACCEPTED"
    assert prop_b.status == "REJECTED"  # Automatically rejected
    assert project.status == "AWARDED"

    # Assert Booking relationship created correctly
    db_booking = db.query(Booking).filter(Booking.proposal_id == prop_a.id).first()
    assert db_booking is not None
    assert db_booking.client_id == client_user.id
    assert db_booking.freelancer_profile_id == profile_a.id
    assert db_booking.source_type == BookingSourceType.PROJECT
    assert db_booking.status == BookingStatus.CONFIRMED
    assert db_booking.agreed_amount == Decimal("28000.00")


def test_proposal_ownership_idor(client, db):
    client_a = create_test_user(db, "client_a@example.com", UserRole.CLIENT)
    client_b = create_test_user(db, "client_b@example.com", UserRole.CLIENT)

    token_b = create_token(client_b.id, "access", role="CLIENT")

    freelancer = create_test_user(db, "free@example.com", UserRole.FREELANCER)
    profile = create_test_freelancer_profile(db, freelancer)
    project_a = create_test_project(db, client_a)

    prop = Proposal(
        project_id=project_a.id,
        freelancer_profile_id=profile.id,
        proposed_amount=Decimal("20000.00"),
        cover_letter="DAYS:5|Cover message",
        status="PENDING"
    )
    db.add(prop)
    db.commit()

    # Client B tries to accept Client A's proposal (403 Forbidden)
    payload = {
        "scheduled_date": "2026-09-30",
        "start_time": "09:00",
        "end_time": "17:00"
    }
    res = client.post(
        f"/api/v1/client/proposals/{prop.id}/accept",
        json=payload,
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res.status_code == 403
