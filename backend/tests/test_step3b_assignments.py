import pytest
from decimal import Decimal
from datetime import datetime, date, time
from typing import Optional, List, Dict, Any
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal
from app.core.security import create_token
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession
from app.models.booking import Booking, BookingStatus, BookingSourceType
from app.models.booking_assignment import BookingAssignment, AssignmentStatus, ClientApprovalStatus
from app.models.message import Conversation, ConversationType
from app.models.admin_audit_log import AdminAuditLog
from app.models.notification import Notification

client = TestClient(app)


def get_token_for_user(user: User) -> str:
    return create_token(subject=user.id, token_type="access", role=user.role.value)


def create_fixture_user(db, role: UserRole, prefix: str) -> User:
    ts = int(datetime.utcnow().timestamp() * 1000) % 10000000
    user = User(
        email=f"{prefix}_{ts}@testdomain.com",
        phone=f"+9177{ts:08d}"[:13],
        password_hash="hashed_test_password",
        full_name=f"User {prefix.title()} {ts}",
        role=role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def create_fixture_profile(db, user: User, title="Lead Cinematographer") -> FreelancerProfile:
    profile = FreelancerProfile(
        user_id=user.id,
        professional_title=title,
        primary_profession=FreelancerProfession.CINEMATOGRAPHER,
        bio="Test creator bio with rich equipment and portfolio.",
        experience_years=6,
        city="Mumbai",
        state="Maharashtra",
        country="India",
        starting_price=Decimal("5000.00"),
        hourly_rate=Decimal("1200.00"),
        event_rate=Decimal("18000.00")
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def create_fixture_managed_booking(db, client_user: User, selected_profile: Optional[FreelancerProfile] = None) -> Booking:
    ts = int(datetime.utcnow().timestamp() * 1000) % 10000000
    booking = Booking(
        booking_number=f"BK-TEST-{ts}",
        client_id=client_user.id,
        selected_freelancer_profile_id=selected_profile.id if selected_profile else None,
        freelancer_profile_id=None,
        is_admin_managed=True,
        source_type=BookingSourceType.SERVICE,
        title="Managed Commercial Shoot",
        booking_type="REMOTE",
        status=BookingStatus.REQUESTED,
        scheduled_date=date(2026, 11, 20),
        start_time=time(10, 0),
        end_time=time(18, 0),
        timezone="Asia/Kolkata",
        location_city="Mumbai",
        location_state="Maharashtra",
        venue_name="Film City Studio 4",
        agreed_amount=Decimal("20000.00"),
        freelancer_payout_amount=Decimal("15000.00"),
        currency="INR",
        price=Decimal("20000.00"),
        deposit_amount=Decimal("6000.00"),
        deposit_paid_amount=Decimal("0.00"),
        remaining_balance=Decimal("14000.00"),
        total_paid=Decimal("0.00"),
        payment_completion_state="UNPAID"
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return booking


# =============================================================================
# TEST 1: Admin reviews booking -> transitions to MATCHING_IN_PROGRESS
# =============================================================================
def test_01_admin_review_booking():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c1")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm1")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr1")
        profile_a = create_fixture_profile(db, creator_a)
        booking = create_fixture_managed_booking(db, client_u, profile_a)
        booking_id = booking.id
        admin_user_id = admin_u.id

        admin_token = get_token_for_user(admin_u)

        res = client.post(
            f"/api/v1/admin/bookings/{booking_id}/review",
            json={"admin_notes": "Verified requirements with client. Initiating creator assignment."},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["id"] == booking_id
        assert data["status"] == "MATCHING_IN_PROGRESS"
        assert data["admin_notes"] == "Verified requirements with client. Initiating creator assignment."

    # Use fresh session to read committed audit log
    with SessionLocal() as db2:
        audit = db2.query(AdminAuditLog).filter(
            AdminAuditLog.entity_id == booking_id,
            AdminAuditLog.action == "BOOKING_REVIEWED"
        ).first()
        assert audit is not None
        assert audit.admin_user_id == admin_user_id


# =============================================================================
# TEST 2: Admin assigns Client-selected Freelancer A (not replacement)
# =============================================================================
def test_02_admin_assign_selected_freelancer():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c2")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm2")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr2")
        profile_a = create_fixture_profile(db, creator_a)
        booking = create_fixture_managed_booking(db, client_u, profile_a)
        booking_id = booking.id
        profile_a_id = profile_a.id

        admin_token = get_token_for_user(admin_u)

        res = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={
                "freelancer_profile_id": profile_a_id,
                "offered_payout_amount": 15000.00,
                "admin_notes": "Offered to client's preferred choice."
            },
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["booking_id"] == booking_id
        assert data["freelancer_profile_id"] == profile_a_id
        assert data["assignment_round"] == 1
        assert data["status"] == "OFFERED"
        assert data["is_replacement"] is False
        assert data["client_approval_required"] is False
        assert data["client_approval_status"] == "NOT_REQUIRED"

    with SessionLocal() as db2:
        b = db2.query(Booking).filter(Booking.id == booking_id).first()
        assert b.freelancer_profile_id is None
        assert b.selected_freelancer_profile_id == profile_a_id


# =============================================================================
# TEST 3: Freelancer A accepts assignment -> Finalized & Confirmed
# =============================================================================
def test_03_freelancer_accept_direct_assignment():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c3")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm3")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr3")
        profile_a = create_fixture_profile(db, creator_a)
        booking = create_fixture_managed_booking(db, client_u, profile_a)
        booking_id = booking.id
        profile_a_id = profile_a.id

        admin_token = get_token_for_user(admin_u)
        res_assign = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_a_id, "offered_payout_amount": 15000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assignment_id = res_assign.json()["id"]

        creator_token = get_token_for_user(creator_a)
        res_accept = client.post(
            f"/api/v1/freelancer/assignments/{assignment_id}/accept",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert res_accept.status_code == 200, res_accept.text
        data = res_accept.json()
        assert data["status"] == "ACCEPTED"

    with SessionLocal() as db2:
        b = db2.query(Booking).filter(Booking.id == booking_id).first()
        assert b.freelancer_profile_id == profile_a_id
        assert b.status == BookingStatus.CONFIRMED
        assert b.confirmed_at is not None


# =============================================================================
# TEST 4: Freelancer A rejects with mandatory reason
# =============================================================================
def test_04_freelancer_reject_with_reason():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c4")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm4")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr4")
        profile_a = create_fixture_profile(db, creator_a)
        booking = create_fixture_managed_booking(db, client_u, profile_a)
        booking_id = booking.id
        profile_a_id = profile_a.id

        admin_token = get_token_for_user(admin_u)
        res_assign = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_a_id, "offered_payout_amount": 15000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assignment_id = res_assign.json()["id"]

        # Reject with empty reason fails
        creator_token = get_token_for_user(creator_a)
        res_bad = client.post(
            f"/api/v1/freelancer/assignments/{assignment_id}/reject",
            json={"reason": "   "},
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert res_bad.status_code in [400, 422]

        # Reject with valid reason succeeds
        res_reject = client.post(
            f"/api/v1/freelancer/assignments/{assignment_id}/reject",
            json={"reason": "Already booked for an outstation documentary shoot."},
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert res_reject.status_code == 200, res_reject.text
        data = res_reject.json()
        assert data["status"] == "DECLINED"
        assert data["decline_reason"] == "Already booked for an outstation documentary shoot."

    with SessionLocal() as db2:
        b = db2.query(Booking).filter(Booking.id == booking_id).first()
        assert b.status == BookingStatus.MATCHING_IN_PROGRESS
        assert b.freelancer_profile_id is None


# =============================================================================
# TEST 5: Freelancer A submits counter offer
# =============================================================================
def test_05_freelancer_submit_counter_offer():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c5")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm5")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr5")
        profile_a = create_fixture_profile(db, creator_a)
        booking = create_fixture_managed_booking(db, client_u, profile_a)
        booking_id = booking.id
        profile_a_id = profile_a.id

        admin_token = get_token_for_user(admin_u)
        res_assign = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_a_id, "offered_payout_amount": 12000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assignment_id = res_assign.json()["id"]

        creator_token = get_token_for_user(creator_a)
        res_counter = client.post(
            f"/api/v1/freelancer/assignments/{assignment_id}/reject",
            json={
                "reason": "Offered amount is below full-day kit rate.",
                "counter_offer_amount": 16500.00,
                "counter_offer_notes": "Includes Sony FX6 + prime lens package."
            },
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert res_counter.status_code == 200, res_counter.text
        data = res_counter.json()
        assert data["status"] == "DECLINED"
        assert Decimal(str(data["counter_offer_amount"])) == Decimal("16500.00")
        assert data["counter_offer_notes"] == "Includes Sony FX6 + prime lens package."

        # Admin can view counter offer in booking detail
        res_detail = client.get(
            f"/api/v1/admin/bookings/{booking_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_detail.status_code == 200
        detail = res_detail.json()
        assert len(detail["assignments"]) == 1
        assert Decimal(str(detail["assignments"][0]["counter_offer_amount"])) == Decimal("16500.00")


# =============================================================================
# TEST 6: Admin reassigns same Freelancer after negotiation -> Round 2
# =============================================================================
def test_06_admin_renegotiate_and_reassign():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c6")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm6")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr6")
        profile_a = create_fixture_profile(db, creator_a)
        booking = create_fixture_managed_booking(db, client_u, profile_a)
        booking_id = booking.id
        profile_a_id = profile_a.id

        admin_token = get_token_for_user(admin_u)
        # Round 1
        res1 = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_a_id, "offered_payout_amount": 12000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assign1_id = res1.json()["id"]

        creator_token = get_token_for_user(creator_a)
        client.post(
            f"/api/v1/freelancer/assignments/{assign1_id}/reject",
            json={"reason": "Kit rate mismatch", "counter_offer_amount": 15000.00},
            headers={"Authorization": f"Bearer {creator_token}"}
        )

        # Round 2: Admin agrees to 15000 and re-offers
        res2 = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_a_id, "offered_payout_amount": 15000.00, "admin_notes": "Agreed to counter-offer."},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res2.status_code == 200, res2.text
        data2 = res2.json()
        assert data2["assignment_round"] == 2
        assert data2["status"] == "OFFERED"
        assert Decimal(str(data2["offered_payout_amount"])) == Decimal("15000.00")

        # Verify history preservation in Admin detail
        res_detail = client.get(
            f"/api/v1/admin/bookings/{booking_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        detail = res_detail.json()
        assert len(detail["assignments"]) == 2
        assert detail["assignments"][0]["assignment_round"] == 1
        assert detail["assignments"][0]["status"] == "DECLINED"
        assert detail["assignments"][1]["assignment_round"] == 2
        assert detail["assignments"][1]["status"] == "OFFERED"


# =============================================================================
# TEST 7: Client selected A -> Admin proposes replacement B
# =============================================================================
def test_07_admin_propose_replacement_freelancer():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c7")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm7")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr7_a")
        creator_b = create_fixture_user(db, UserRole.FREELANCER, "cr7_b")
        profile_a = create_fixture_profile(db, creator_a, "Selected Creator")
        profile_b = create_fixture_profile(db, creator_b, "Replacement Creator")
        booking = create_fixture_managed_booking(db, client_u, profile_a)
        booking_id = booking.id
        profile_b_id = profile_b.id

        admin_token = get_token_for_user(admin_u)
        res_assign = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_b_id, "offered_payout_amount": 14000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_assign.status_code == 200, res_assign.text
        data = res_assign.json()
        assert data["freelancer_profile_id"] == profile_b_id
        assert data["is_replacement"] is True
        assert data["client_approval_required"] is True
        assert data["client_approval_status"] == "PENDING"


# =============================================================================
# TEST 8: Replacement B accepts before Client approves -> Not finalized yet
# =============================================================================
def test_08_replacement_accepts_before_client_approval():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c8")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm8")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr8_a")
        creator_b = create_fixture_user(db, UserRole.FREELANCER, "cr8_b")
        profile_a = create_fixture_profile(db, creator_a)
        profile_b = create_fixture_profile(db, creator_b)
        booking = create_fixture_managed_booking(db, client_u, profile_a)
        booking_id = booking.id
        profile_b_id = profile_b.id

        admin_token = get_token_for_user(admin_u)
        res_assign = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_b_id, "offered_payout_amount": 14000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assignment_id = res_assign.json()["id"]

        creator_b_token = get_token_for_user(creator_b)
        res_accept = client.post(
            f"/api/v1/freelancer/assignments/{assignment_id}/accept",
            headers={"Authorization": f"Bearer {creator_b_token}"}
        )
        assert res_accept.status_code == 200
        assert res_accept.json()["status"] == "ACCEPTED"
        assert res_accept.json()["client_approval_status"] == "PENDING"

    with SessionLocal() as db2:
        b = db2.query(Booking).filter(Booking.id == booking_id).first()
        assert b.freelancer_profile_id is None
        assert b.status == BookingStatus.MATCHING_IN_PROGRESS


# =============================================================================
# TEST 9: Client approves Replacement B -> Finalized & Confirmed
# =============================================================================
def test_09_client_approves_replacement_and_finalizes():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c9")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm9")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr9_a")
        creator_b = create_fixture_user(db, UserRole.FREELANCER, "cr9_b")
        profile_a = create_fixture_profile(db, creator_a)
        profile_b = create_fixture_profile(db, creator_b)
        booking = create_fixture_managed_booking(db, client_u, profile_a)
        booking_id = booking.id
        profile_a_id = profile_a.id
        profile_b_id = profile_b.id

        admin_token = get_token_for_user(admin_u)
        res_assign = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_b_id, "offered_payout_amount": 14000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assignment_id = res_assign.json()["id"]

        # 1. Creator B accepts
        creator_b_token = get_token_for_user(creator_b)
        client.post(
            f"/api/v1/freelancer/assignments/{assignment_id}/accept",
            headers={"Authorization": f"Bearer {creator_b_token}"}
        )

        # 2. Client approves replacement
        client_token = get_token_for_user(client_u)
        res_decision = client.post(
            f"/api/v1/client/bookings/{booking_id}/replacement/{assignment_id}/respond",
            json={"approved": True, "notes": "Approved, portfolio looks great."},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert res_decision.status_code == 200, res_decision.text
        data = res_decision.json()
        assert data["client_approval_status"] == "APPROVED"

    with SessionLocal() as db2:
        b = db2.query(Booking).filter(Booking.id == booking_id).first()
        assert b.selected_freelancer_profile_id == profile_a_id
        assert b.freelancer_profile_id == profile_b_id
        assert b.status == BookingStatus.CONFIRMED


# =============================================================================
# TEST 10: Client rejects Replacement B -> Assignment cancelled, booking matching
# =============================================================================
def test_10_client_rejects_replacement():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c10")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm10")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr10_a")
        creator_b = create_fixture_user(db, UserRole.FREELANCER, "cr10_b")
        profile_a = create_fixture_profile(db, creator_a)
        profile_b = create_fixture_profile(db, creator_b)
        booking = create_fixture_managed_booking(db, client_u, profile_a)
        booking_id = booking.id
        profile_b_id = profile_b.id

        admin_token = get_token_for_user(admin_u)
        res_assign = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_b_id, "offered_payout_amount": 14000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assignment_id = res_assign.json()["id"]

        # Client rejects
        client_token = get_token_for_user(client_u)
        res_decision = client.post(
            f"/api/v1/client/bookings/{booking_id}/replacement/{assignment_id}/respond",
            json={"approved": False, "notes": "Style does not match our brand aesthetics."},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert res_decision.status_code == 200, res_decision.text
        data = res_decision.json()
        assert data["client_approval_status"] == "REJECTED"
        assert data["status"] == "CANCELLED"

    with SessionLocal() as db2:
        b = db2.query(Booking).filter(Booking.id == booking_id).first()
        assert b.freelancer_profile_id is None
        assert b.status == BookingStatus.MATCHING_IN_PROGRESS


# =============================================================================
# TEST 11: Unauthorized Client tries approving someone else's replacement -> 403
# =============================================================================
def test_11_unauthorized_client_replacement_decision():
    with SessionLocal() as db:
        client_owner = create_fixture_user(db, UserRole.CLIENT, "c11_owner")
        client_attacker = create_fixture_user(db, UserRole.CLIENT, "c11_attacker")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm11")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr11_a")
        creator_b = create_fixture_user(db, UserRole.FREELANCER, "cr11_b")
        profile_a = create_fixture_profile(db, creator_a)
        profile_b = create_fixture_profile(db, creator_b)
        booking = create_fixture_managed_booking(db, client_owner, profile_a)
        booking_id = booking.id
        profile_b_id = profile_b.id

        admin_token = get_token_for_user(admin_u)
        res_assign = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_b_id, "offered_payout_amount": 14000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assignment_id = res_assign.json()["id"]

        attacker_token = get_token_for_user(client_attacker)
        res_forbidden = client.post(
            f"/api/v1/client/bookings/{booking_id}/replacement/{assignment_id}/respond",
            json={"approved": True},
            headers={"Authorization": f"Bearer {attacker_token}"}
        )
        assert res_forbidden.status_code == 403


# =============================================================================
# TEST 12: Freelancer A tries accepting assignment for Freelancer B -> 403
# =============================================================================
def test_12_unauthorized_freelancer_accept():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c12")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm12")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr12_a")
        creator_b = create_fixture_user(db, UserRole.FREELANCER, "cr12_b")
        profile_a = create_fixture_profile(db, creator_a)
        profile_b = create_fixture_profile(db, creator_b)
        booking = create_fixture_managed_booking(db, client_u, profile_a)
        booking_id = booking.id
        profile_b_id = profile_b.id

        # Admin assigns Creator B
        admin_token = get_token_for_user(admin_u)
        res_assign = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_b_id, "offered_payout_amount": 14000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assignment_id = res_assign.json()["id"]

        # Creator A attempts to accept Creator B's offer
        creator_a_token = get_token_for_user(creator_a)
        res_forbidden = client.post(
            f"/api/v1/freelancer/assignments/{assignment_id}/accept",
            headers={"Authorization": f"Bearer {creator_a_token}"}
        )
        assert res_forbidden.status_code == 403


# =============================================================================
# TEST 13: Client tries Admin assignment endpoint -> 403
# =============================================================================
def test_13_client_cannot_call_admin_assign():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c13")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr13")
        profile_a = create_fixture_profile(db, creator_a)
        booking = create_fixture_managed_booking(db, client_u, profile_a)
        booking_id = booking.id
        profile_a_id = profile_a.id

        client_token = get_token_for_user(client_u)
        res = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_a_id, "offered_payout_amount": 15000.00},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert res.status_code == 403


# =============================================================================
# TEST 14: Admin tries assigning invalid creator -> 400/404
# =============================================================================
def test_14_admin_assign_invalid_creator():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c14")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm14")
        booking = create_fixture_managed_booking(db, client_u)
        booking_id = booking.id

        admin_token = get_token_for_user(admin_u)

        # 1. Non-existent profile ID
        res_404 = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": 999999, "offered_payout_amount": 10000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_404.status_code in [400, 404]

        # 2. Inactive creator user
        inactive_user = create_fixture_user(db, UserRole.FREELANCER, "cr14_inactive")
        inactive_user.is_active = False
        db.commit()
        inactive_profile = create_fixture_profile(db, inactive_user)
        inactive_profile_id = inactive_profile.id

        res_inactive = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": inactive_profile_id, "offered_payout_amount": 10000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res_inactive.status_code == 400


# =============================================================================
# TEST 15: Double Freelancer Accept is idempotent
# =============================================================================
def test_15_double_freelancer_accept_idempotent():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c15")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm15")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr15")
        profile_a = create_fixture_profile(db, creator_a)
        booking = create_fixture_managed_booking(db, client_u, profile_a)
        booking_id = booking.id
        profile_a_id = profile_a.id

        admin_token = get_token_for_user(admin_u)
        res_assign = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_a_id, "offered_payout_amount": 15000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assignment_id = res_assign.json()["id"]

        creator_token = get_token_for_user(creator_a)
        # First accept
        res1 = client.post(
            f"/api/v1/freelancer/assignments/{assignment_id}/accept",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert res1.status_code == 200

        # Second accept (idempotent)
        res2 = client.post(
            f"/api/v1/freelancer/assignments/{assignment_id}/accept",
            headers={"Authorization": f"Bearer {creator_token}"}
        )
        assert res2.status_code == 200
        assert res2.json()["status"] == "ACCEPTED"


# =============================================================================
# TEST 16: Double Client replacement approval is idempotent
# =============================================================================
def test_16_double_client_approval_idempotent():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c16")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm16")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr16_a")
        creator_b = create_fixture_user(db, UserRole.FREELANCER, "cr16_b")
        profile_a = create_fixture_profile(db, creator_a)
        profile_b = create_fixture_profile(db, creator_b)
        booking = create_fixture_managed_booking(db, client_u, profile_a)
        booking_id = booking.id
        profile_b_id = profile_b.id

        admin_token = get_token_for_user(admin_u)
        res_assign = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_b_id, "offered_payout_amount": 14000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assignment_id = res_assign.json()["id"]

        client_token = get_token_for_user(client_u)
        # First approve
        res1 = client.post(
            f"/api/v1/client/bookings/{booking_id}/replacement/{assignment_id}/respond",
            json={"approved": True, "notes": "Approved 1"},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert res1.status_code == 200

        # Second approve (idempotent)
        res2 = client.post(
            f"/api/v1/client/bookings/{booking_id}/replacement/{assignment_id}/respond",
            json={"approved": True, "notes": "Approved 2"},
            headers={"Authorization": f"Bearer {client_token}"}
        )
        assert res2.status_code == 200
        assert res2.json()["client_approval_status"] == "APPROVED"


# =============================================================================
# TEST 17: Legacy booking loads cleanly without BookingAssignment
# =============================================================================
def test_17_legacy_booking_detail_without_assignments():
    with SessionLocal() as db:
        client_u = create_fixture_user(db, UserRole.CLIENT, "c17")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm17")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr17")
        profile_a = create_fixture_profile(db, creator_a)

        # Legacy booking: not admin managed, direct confirmed
        ts = int(datetime.utcnow().timestamp() * 1000) % 10000000
        legacy_booking = Booking(
            booking_number=f"LEGACY-{ts}",
            client_id=client_u.id,
            freelancer_profile_id=profile_a.id,
            selected_freelancer_profile_id=profile_a.id,
            is_admin_managed=False,
            source_type=BookingSourceType.SERVICE,
            title="Legacy Direct Shoot",
            booking_type="ON_SITE",
            status=BookingStatus.CONFIRMED,
            agreed_amount=Decimal("18000.00"),
            price=Decimal("18000.00"),
            deposit_amount=Decimal("5400.00"),
            deposit_paid_amount=Decimal("5400.00"),
            remaining_balance=Decimal("12600.00"),
            total_paid=Decimal("5400.00"),
            currency="INR"
        )
        db.add(legacy_booking)
        db.commit()
        db.refresh(legacy_booking)
        legacy_booking_id = legacy_booking.id

        admin_token = get_token_for_user(admin_u)
        res = client.get(
            f"/api/v1/admin/bookings/{legacy_booking_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert res.status_code == 200, res.text
        data = res.json()
        assert data["id"] == legacy_booking_id
        assert data["is_admin_managed"] is False
        assert data["assignments"] == []


# =============================================================================
# TEST 18: No new direct Client<->Freelancer conversation is created
# =============================================================================
def test_18_no_direct_conversation_created_by_assignment_engine():
    with SessionLocal() as db:
        initial_direct_convo_count = db.query(Conversation).filter(
            Conversation.conversation_type == ConversationType.DIRECT_LEGACY.value
        ).count()

        client_u = create_fixture_user(db, UserRole.CLIENT, "c18")
        admin_u = create_fixture_user(db, UserRole.ADMIN, "adm18")
        creator_a = create_fixture_user(db, UserRole.FREELANCER, "cr18")
        profile_a = create_fixture_profile(db, creator_a)
        booking = create_fixture_managed_booking(db, client_u, profile_a)
        booking_id = booking.id
        profile_a_id = profile_a.id

        admin_token = get_token_for_user(admin_u)

        # 1. Admin reviews
        client.post(
            f"/api/v1/admin/bookings/{booking_id}/review",
            json={"admin_notes": "Reviewed"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        # 2. Admin assigns
        res_assign = client.post(
            f"/api/v1/admin/bookings/{booking_id}/assign",
            json={"freelancer_profile_id": profile_a_id, "offered_payout_amount": 15000.00},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assignment_id = res_assign.json()["id"]

        # 3. Creator accepts
        creator_token = get_token_for_user(creator_a)
        client.post(
            f"/api/v1/freelancer/assignments/{assignment_id}/accept",
            headers={"Authorization": f"Bearer {creator_token}"}
        )

    # Invariant: zero new DIRECT client<->freelancer conversations created
    with SessionLocal() as db2:
        final_direct_convo_count = db2.query(Conversation).filter(
            Conversation.conversation_type == ConversationType.DIRECT_LEGACY.value
        ).count()
        assert final_direct_convo_count == initial_direct_convo_count

        # Exactly 1 FREELANCER_ADMIN conversation created
        f_convos = db2.query(Conversation).filter(
            Conversation.booking_id == booking_id,
            Conversation.conversation_type == ConversationType.FREELANCER_ADMIN.value
        ).all()
        assert len(f_convos) == 1
        assert f_convos[0].client_id is None
