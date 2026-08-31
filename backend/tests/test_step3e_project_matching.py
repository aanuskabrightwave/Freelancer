import pytest
from decimal import Decimal
from datetime import datetime, date, time, timedelta
from typing import Optional, List, Dict, Any

from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession
from app.models.booking import Booking, BookingStatus, BookingSourceType
from app.models.booking_assignment import BookingAssignment, AssignmentStatus, ClientApprovalStatus
from app.models.message import Conversation, Message, ConversationType
from app.models.conversation_participant import ConversationParticipant
from app.models.notification import Notification
from app.models.admin_audit_log import AdminAuditLog
from app.models.project import Project, Proposal
from app.models.email_delivery import EmailDelivery
from app.services.admin_messaging_service import AdminMessagingService


def get_token_for_user(user: User) -> str:
    return create_token(subject=user.id, token_type="access", role=user.role.value if hasattr(user.role, "value") else str(user.role))


from app.core.security import create_token


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


def test_01_client_creates_managed_project(db, client):
    # Seed admin first
    admin_user = create_fixture_user(db, UserRole.ADMIN, "admin")
    client_user = create_fixture_user(db, UserRole.CLIENT, "client")
    
    client_token = get_token_for_user(client_user)
    client_headers = {"Authorization": f"Bearer {client_token}"}
    
    payload = {
        "title": "Corporate Video Shoot",
        "description": "Catered highlight reel shoot.",
        "project_type": "ON_SITE",
        "budget_min": 10000.00,
        "budget_max": 15000.00,
        "category_id": 1,
        "deadline": "2026-12-25",
        "city": "Mumbai",
        "state": "Maharashtra",
        "country": "India",
        "is_admin_managed": True
    }
    
    res = client.post("/api/v1/projects", json=payload, headers=client_headers)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["title"] == "Corporate Video Shoot"
    assert data["status"] == "SUBMITTED"
    assert data["is_admin_managed"] is True
    project_id = data["id"]
    
    # Verify CLIENT_ADMIN conversation created
    convo = db.query(Conversation).filter(
        Conversation.project_id == project_id,
        Conversation.conversation_type == "CLIENT_ADMIN"
    ).first()
    assert convo is not None
    assert convo.client_id == client_user.id
    assert convo.admin_id == admin_user.id
    
    # Verify notifications dispatched
    admin_notif = db.query(Notification).filter(
        Notification.user_id == admin_user.id,
        Notification.event_code == "PROJECT_PUBLISHED"
    ).first()
    assert admin_notif is not None
    assert "submitted" in admin_notif.message.lower()


def test_02_proposal_submission_is_blocked_on_managed_project(db, client):
    client_user = create_fixture_user(db, UserRole.CLIENT, "client")
    freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "free")
    freelancer_profile = create_fixture_profile(db, freelancer_user)
    
    free_token = get_token_for_user(freelancer_user)
    free_headers = {"Authorization": f"Bearer {free_token}"}
    
    # Create managed project
    project = Project(
        client_id=client_user.id,
        title="Admin Curation Project",
        description="CAT:1|MIN:1000|MAX:2000|DL:2026-12-25|Managed project brief description.",
        project_type="REMOTE",
        budget=2000.0,
        status="SUBMITTED",
        is_admin_managed=True
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    proposal_payload = {
        "proposed_amount": 1800.00,
        "delivery_days": 5,
        "cover_letter": "I want to apply to this managed project."
    }
    res = client.post(f"/api/v1/projects/{project.id}/proposals", json=proposal_payload, headers=free_headers)
    assert res.status_code == 400, res.text
    assert "managed by Admin and does not accept direct proposals" in res.json()["detail"]


def test_03_legacy_proposal_submission_works(db, client):
    client_user = create_fixture_user(db, UserRole.CLIENT, "client")
    freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "free")
    freelancer_profile = create_fixture_profile(db, freelancer_user)
    
    free_token = get_token_for_user(freelancer_user)
    free_headers = {"Authorization": f"Bearer {free_token}"}
    
    # Create legacy project
    project = Project(
        client_id=client_user.id,
        title="Legacy Open Project",
        description="CAT:1|MIN:1000|MAX:2000|DL:2026-12-25|Legacy project description.",
        project_type="REMOTE",
        budget=2000.0,
        status="OPEN",
        is_admin_managed=False
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    proposal_payload = {
        "proposed_amount": 1800.00,
        "delivery_days": 5,
        "cover_letter": "I want to apply to this legacy project."
    }
    res = client.post(f"/api/v1/projects/{project.id}/proposals", json=proposal_payload, headers=free_headers)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["status"] == "PENDING"


def test_04_freelancer_browse_projects_excludes_managed_projects(db, client):
    client_user = create_fixture_user(db, UserRole.CLIENT, "client")
    freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "free")
    
    free_token = get_token_for_user(freelancer_user)
    free_headers = {"Authorization": f"Bearer {free_token}"}
    
    # Create managed project
    project_managed = Project(
        client_id=client_user.id,
        title="Hidden Managed Project",
        description="CAT:1|MIN:1000|MAX:2000|DL:2026-12-25|Brief.",
        project_type="REMOTE",
        budget=2000.0,
        status="OPEN", # Even if OPEN, it should be excluded!
        is_admin_managed=True
    )
    
    # Create legacy project
    project_legacy = Project(
        client_id=client_user.id,
        title="Visible Legacy Project",
        description="CAT:1|MIN:1000|MAX:2000|DL:2026-12-25|Legacy.",
        project_type="REMOTE",
        budget=2000.0,
        status="OPEN",
        is_admin_managed=False
    )
    
    db.add(project_managed)
    db.add(project_legacy)
    db.commit()
    
    res = client.get("/api/v1/projects", headers=free_headers)
    assert res.status_code == 200, res.text
    titles = [p["title"] for p in res.json()]
    assert "Visible Legacy Project" in titles
    assert "Hidden Managed Project" not in titles


def test_05_admin_projects_list_and_match_lifecycle(db, client):
    admin_user = create_fixture_user(db, UserRole.ADMIN, "admin")
    client_user = create_fixture_user(db, UserRole.CLIENT, "client")
    freelancer_user = create_fixture_user(db, UserRole.FREELANCER, "free")
    freelancer_profile = create_fixture_profile(db, freelancer_user)
    
    admin_token = get_token_for_user(admin_user)
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    client_token = get_token_for_user(client_user)
    client_headers = {"Authorization": f"Bearer {client_token}"}
    
    free_token = get_token_for_user(freelancer_user)
    free_headers = {"Authorization": f"Bearer {free_token}"}
    
    # 1. Create project
    project = Project(
        client_id=client_user.id,
        title="General Video Post",
        description="CAT:1|MIN:5000|MAX:7000|DL:2026-12-25|General project description.",
        project_type="ON_SITE",
        budget=7000.0,
        status="SUBMITTED",
        is_admin_managed=True
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Spin up CLIENT_ADMIN conversation
    convo = AdminMessagingService.get_or_create_client_admin_conversation(
        db=db,
        client_id=client_user.id,
        project_id=project.id
    )
    db.commit()
    
    # 2. Project appears in Admin Job Posts list
    list_res = client.get("/api/v1/admin/projects", headers=admin_headers)
    assert list_res.status_code == 200, list_res.text
    titles = [p["title"] for p in list_res.json()["items"]]
    assert "General Video Post" in titles
    rev_res = client.post(
        f"/api/v1/admin/projects/{project.id}/review",
        json={"status": "UNDER_ADMIN_REVIEW", "admin_review_notes": "Reviewed and verified budget."},
        headers=admin_headers
    )
    assert rev_res.status_code == 200, rev_res.text
    assert rev_res.json()["status"] == "UNDER_ADMIN_REVIEW"
    
    # 4. Admin transitions to MATCHING
    match_start_res = client.post(
        f"/api/v1/admin/projects/{project.id}/review",
        json={"status": "MATCHING"},
        headers=admin_headers
    )
    assert match_start_res.status_code == 200, match_start_res.text
    assert match_start_res.json()["status"] == "MATCHING"
    
    # 5. Admin matches freelancer
    match_payload = {
        "freelancer_profile_id": freelancer_profile.id,
        "offered_payout_amount": 5000.00,
        "admin_notes": "Perfect profile match."
    }
    match_res = client.post(
        f"/api/v1/admin/projects/{project.id}/match",
        json=match_payload,
        headers=admin_headers
    )
    assert match_res.status_code == 200, match_res.text
    assign_data = match_res.json()
    assert assign_data["status"] == "OFFERED"
    assert assign_data["is_replacement"] is True
    assert assign_data["client_approval_required"] is True
    assert assign_data["client_approval_status"] == "PENDING"
    
    booking_id = assign_data["booking_id"]
    assignment_id = assign_data["id"]
    
    # 6. Verify Booking created correctly
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    assert booking is not None
    assert booking.source_type.value == BookingSourceType.PROJECT.value
    assert booking.project_id == project.id
    assert booking.status == BookingStatus.MATCHING_IN_PROGRESS
    
    # 7. Repeated match calls do not create duplicate Booking
    match_res2 = client.post(
        f"/api/v1/admin/projects/{project.id}/match",
        json=match_payload,
        headers=admin_headers
    )
    assert match_res2.status_code == 409  # Conflict because active assignment offer already exists!
    
    # 8. Freelancer/Admin conversation created and Client absent
    free_convo = db.query(Conversation).filter(
        Conversation.booking_id == booking_id,
        Conversation.conversation_type == "FREELANCER_ADMIN"
    ).first()
    assert free_convo is not None
    assert free_convo.freelancer_id == freelancer_user.id
    assert free_convo.client_id is None
    
    # 9. Client approves matched freelancer
    approve_res = client.post(
        f"/api/v1/client/assignments/{assignment_id}/respond",
        json={"approved": True, "notes": "Approved matching!"},
        headers=client_headers
    )
    assert approve_res.status_code == 200, approve_res.text
    assert approve_res.json()["client_approval_status"] == "APPROVED"
    
    # 10. Freelancer accepts assignment
    accept_res = client.post(
        f"/api/v1/freelancer/assignments/{assignment_id}/accept",
        headers=free_headers
    )
    assert accept_res.status_code == 200, accept_res.text
    assert accept_res.json()["status"] == "ACCEPTED"
    
    # 11. Booking transitions to CONFIRMED
    db.refresh(booking)
    assert booking.status == BookingStatus.CONFIRMED
    assert booking.freelancer_profile_id == freelancer_profile.id
    
    # 12. Client details response matches
    detail_res = client.get(f"/api/v1/client/projects/{project.id}", headers=client_headers)
    assert detail_res.status_code == 200, detail_res.text
    d_data = detail_res.json()
    assert d_data["booking_id"] == booking_id
    assert d_data["matched_freelancer"]["id"] == freelancer_profile.id
    assert d_data["admin_conversation_id"] == convo.id


def test_06_unauthorized_access_protection(db, client):
    client_a = create_fixture_user(db, UserRole.CLIENT, "client_a")
    client_b = create_fixture_user(db, UserRole.CLIENT, "client_b")
    
    token_b = get_token_for_user(client_b)
    headers_b = {"Authorization": f"Bearer {token_b}"}
    
    project = Project(
        client_id=client_a.id,
        title="Private Briefing",
        description="CAT:1|MIN:5000|MAX:7000|DL:2026-12-25|Private project scope.",
        project_type="ON_SITE",
        budget=7000.0,
        status="SUBMITTED",
        is_admin_managed=True
    )
    db.add(project)
    db.commit()
    db.refresh(project)
    
    # Client B cannot view Client A's project detail
    res = client.get(f"/api/v1/client/projects/{project.id}", headers=headers_b)
    assert res.status_code == 403
