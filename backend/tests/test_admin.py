import pytest
from decimal import Decimal
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession, VerificationStatus
from app.models.service import Service, ServiceStatus, ServiceType
from app.models.service_package import ServicePackage, PackageType
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment
from app.models.refund import Refund
from app.models.review import Review, ReviewStatus
from app.models.dispute import Dispute, DisputeStatus, DisputeReason, ResolutionType
from app.models.admin_audit_log import AdminAuditLog
from app.models.platform_setting import PlatformSetting
from app.core.security import get_password_hash, create_token
from app.services.verification_service import VerificationService
from app.services.dispute_service import DisputeService
from app.services.rating_service import RatingService


@pytest.fixture
def test_users(db: Session):
    # Create client
    client = User(
        full_name="John Client",
        email="john_client@example.com",
        phone="9876543210",
        password_hash=get_password_hash("password123"),
        role=UserRole.CLIENT,
        is_verified=True
    )
    # Create freelancer
    freelancer = User(
        full_name="Aarav Creator",
        email="aarav_creator@example.com",
        phone="9876543211",
        password_hash=get_password_hash("password123"),
        role=UserRole.FREELANCER,
        is_verified=True
    )
    # Create admin
    admin = User(
        full_name="Super Admin",
        email="admin_dev@example.com",
        phone="9876543212",
        password_hash=get_password_hash("password123"),
        role=UserRole.ADMIN,
        is_verified=True
    )
    db.add(client)
    db.add(freelancer)
    db.add(admin)
    db.commit()
    db.refresh(client)
    db.refresh(freelancer)
    db.refresh(admin)
    return {"client": client, "freelancer": freelancer, "admin": admin}


@pytest.fixture
def freelancer_profile(db: Session, test_users):
    profile = FreelancerProfile(
        user_id=test_users["freelancer"].id,
        professional_title="Camera Expert",
        primary_profession=FreelancerProfession.PHOTOGRAPHER,
        bio="Wedding coverage expert",
        experience_years=6,
        city="Delhi",
        state="Delhi",
        country="India",
        is_profile_public=True,
        verification_status=VerificationStatus.NOT_SUBMITTED,
        profile_completion_percentage=95
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


@pytest.fixture
def service(db: Session, freelancer_profile):
    srv = Service(
        freelancer_profile_id=freelancer_profile.id,
        title="Premium Photoshoot",
        slug="premium-photoshoot",
        short_description="Elite shoots",
        description="Premium photography package description",
        service_type=ServiceType.ON_SITE,
        starting_price=Decimal("20000.00"),
        status=ServiceStatus.PUBLISHED
    )
    db.add(srv)
    db.commit()
    db.refresh(srv)

    pkg = ServicePackage(
        service_id=srv.id,
        name="Gold Package",
        description="Full coverage and editing",
        price=Decimal("20000.00"),
        package_type=PackageType.STANDARD,
        revisions=3,
        delivery_time_days=5
    )
    db.add(pkg)
    db.commit()
    return srv


@pytest.fixture
def client_headers(test_users):
    token = create_token(test_users["client"].id, "access")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def freelancer_headers(test_users):
    token = create_token(test_users["freelancer"].id, "access")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_headers(test_users):
    token = create_token(test_users["admin"].id, "access")
    return {"Authorization": f"Bearer {token}"}


# ----------------------------------------------------
# 1. SECURITY & ROLE AUTH TESTS
# ----------------------------------------------------

def test_admin_auth_guards(client: TestClient, client_headers, freelancer_headers, admin_headers):
    # Unauthenticated -> 401
    resp = client.get("/api/v1/admin/dashboard")
    assert resp.status_code == 401

    # Client role -> 403
    resp = client.get("/api/v1/admin/dashboard", headers=client_headers)
    assert resp.status_code == 403

    # Freelancer role -> 403
    resp = client.get("/api/v1/admin/dashboard", headers=freelancer_headers)
    assert resp.status_code == 403

    # Admin role -> 200
    resp = client.get("/api/v1/admin/dashboard", headers=admin_headers)
    assert resp.status_code == 200
    assert "users" in resp.json()


# ----------------------------------------------------
# 2. USER SUSPENSION & REACTIVATION TESTS
# ----------------------------------------------------

def test_user_suspension_logic(client: TestClient, db: Session, test_users, admin_headers):
    target_user = test_users["client"]

    # Suspend user
    payload = {"reason": "Abusive behavior in messaging workspaces."}
    resp = client.post(f"/api/v1/admin/users/{target_user.id}/suspend", json=payload, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["message"] == "User account suspended successfully."

    # Validate db state
    db.refresh(target_user)
    assert target_user.is_active is False

    # Check Audit Log created
    audit = db.query(AdminAuditLog).filter(
        AdminAuditLog.action == "USER_SUSPENDED",
        AdminAuditLog.entity_id == target_user.id
    ).first()
    assert audit is not None
    assert "Abusive behavior" in audit.description

    # Reactivate user
    resp = client.post(f"/api/v1/admin/users/{target_user.id}/reactivate", headers=admin_headers)
    assert resp.status_code == 200
    db.refresh(target_user)
    assert target_user.is_active is True

    # Audit reactivate log
    audit_reactivate = db.query(AdminAuditLog).filter(
        AdminAuditLog.action == "USER_REACTIVATED",
        AdminAuditLog.entity_id == target_user.id
    ).first()
    assert audit_reactivate is not None


def test_admin_self_suspension_prevention(client: TestClient, test_users, admin_headers):
    admin_id = test_users["admin"].id
    payload = {"reason": "Accidental self lockout attempt."}
    resp = client.post(f"/api/v1/admin/users/{admin_id}/suspend", json=payload, headers=admin_headers)
    assert resp.status_code == 400
    assert "cannot suspend their own active accounts" in resp.json()["detail"]


# ----------------------------------------------------
# 3. VERIFICATION QUEUE & BADGE TESTS
# ----------------------------------------------------

def test_verification_review_flow(client: TestClient, db: Session, test_users, freelancer_profile, admin_headers):
    # 1. Freelancer submits verification docs
    docs_payload = [
        {"document_type": "IDENTITY_DOCUMENT", "file_path": "/uploads/id.pdf", "mime_type": "application/pdf"}
    ]
    v = VerificationService.submit_verification(db, freelancer_profile.id, docs_payload)
    assert v.status == VerificationStatus.PENDING

    # 2. Admin start review
    client.post(f"/api/v1/admin/verifications/{v.id}/start-review", headers=admin_headers)
    db.refresh(v)
    assert v.status == VerificationStatus.UNDER_REVIEW

    # 3. Admin rejects verification (first try)
    rej_payload = {"reason": "ID card photo is unreadable and cropped."}
    client.post(f"/api/v1/admin/verifications/{v.id}/reject", json=rej_payload, headers=admin_headers)
    db.refresh(v)
    assert v.status == VerificationStatus.REJECTED

    # Re-submit and approve verification
    v_new = VerificationService.submit_verification(db, freelancer_profile.id, docs_payload)
    client.post(f"/api/v1/admin/verifications/{v_new.id}/approve", json={"admin_notes": "All clear"}, headers=admin_headers)
    db.refresh(v_new)
    assert v_new.status == VerificationStatus.VERIFIED

    # Check freelancer has awarded IDENTITY_VERIFIED badge
    db.refresh(freelancer_profile)
    assert freelancer_profile.verification_status == VerificationStatus.VERIFIED
    active_badges = [fb.badge.code for fb in freelancer_profile.badges if fb.is_active]
    assert "IDENTITY_VERIFIED" in active_badges


# ----------------------------------------------------
# 4. DISPUTE PIPELINE & EVIDENCE TESTS
# ----------------------------------------------------

def test_dispute_resolution(client: TestClient, db: Session, test_users, freelancer_profile, service, client_headers, admin_headers):
    from datetime import datetime, timedelta
    # Create completed booking
    booking = Booking(
        booking_number="B-999",
        client_id=test_users["client"].id,
        freelancer_profile_id=freelancer_profile.id,
        service_id=service.id,
        status=BookingStatus.COMPLETED,
        agreed_amount=Decimal("15000.00"),
        price=Decimal("15000.00"),
        dispute_window_ends_at=datetime.now() + timedelta(hours=48)
    )
    db.add(booking)
    db.commit()

    # Capture payment
    payment = Payment(
        payment_number="PAY-999",
        booking_id=booking.id,
        client_id=test_users["client"].id,
        freelancer_profile_id=freelancer_profile.id,
        gross_amount=Decimal("15000.00"),
        platform_fee_amount=Decimal("1500.00"),
        freelancer_amount=Decimal("13500.00"),
        commission_percent_snapshot=Decimal("10.00"),
        status="CAPTURED",
        provider="RAZORPAY",
        provider_order_id="order_999",
        provider_payment_id="pay_999"
    )
    db.add(payment)
    db.commit()

    # 1. Open Dispute
    disp_payload = {
        "reason": DisputeReason.WORK_NOT_DELIVERED,
        "description": "The photographer left early and didn't share the RAW deliverables files."
    }
    resp = client.post(f"/api/v1/bookings/{booking.id}/disputes", json=disp_payload, headers=client_headers)
    assert resp.status_code == 201
    dispute_id = resp.json()["id"]

    # Check active dispute duplication prevention
    resp_dup = client.post(f"/api/v1/bookings/{booking.id}/disputes", json=disp_payload, headers=client_headers)
    assert resp_dup.status_code == 400

    # 2. Assign dispute
    client.post(f"/api/v1/admin/disputes/{dispute_id}/assign", headers=admin_headers)

    # 3. Post Message
    msg_payload = {"message": "Waiting for feedback.", "is_internal_admin_note": True}
    client.post(f"/api/v1/admin/disputes/{dispute_id}/message", json=msg_payload, headers=admin_headers)

    # 4. Resolve Dispute via partial refund (excess refund protection check)
    res_payload_invalid = {
        "resolution_type": ResolutionType.PARTIAL_REFUND,
        "resolution_notes": "Refunding partial amount",
        "partial_refund_amount": 18000.00 # Exceeds gross amount
    }
    resp_resolve = client.post(f"/api/v1/admin/disputes/{dispute_id}/resolve", json=res_payload_invalid, headers=admin_headers)
    assert resp_resolve.status_code == 400

    res_payload_valid = {
        "resolution_type": ResolutionType.PARTIAL_REFUND,
        "resolution_notes": "Refunding partial amount",
        "partial_refund_amount": 5000.00
    }
    resp_resolve = client.post(f"/api/v1/admin/disputes/{dispute_id}/resolve", json=res_payload_valid, headers=admin_headers)
    assert resp_resolve.status_code == 200

    # Assert resolution statuses
    dispute = db.query(Dispute).filter(Dispute.id == dispute_id).first()
    assert dispute.status == DisputeStatus.RESOLVED


# ----------------------------------------------------
# 5. PLATFORM CONFIGURATION SETTINGS TESTS
# ----------------------------------------------------

def test_settings_updates_and_safety(client: TestClient, db: Session, admin_headers, client_headers):
    # 1. Retrieve public setting
    resp = client.get("/api/v1/admin/settings", headers=admin_headers)
    assert resp.status_code == 200
    assert len(resp.json()) >= 1

    # 2. Update config key
    payload = {"value": "12.50"}
    resp = client.patch("/api/v1/admin/settings/PLATFORM_COMMISSION_PERCENT", json=payload, headers=admin_headers)
    assert resp.status_code == 200
    assert resp.json()["value"] == "12.50"

    # Client try to retrieve settings -> 403
    resp = client.get("/api/v1/admin/settings", headers=client_headers)
    assert resp.status_code == 403

    # Client try to patch settings -> 403
    resp = client.patch("/api/v1/admin/settings/PLATFORM_COMMISSION_PERCENT", json=payload, headers=client_headers)
    assert resp.status_code == 403


# ----------------------------------------------------
# 6. REVIEW MODERATION & Rating AGGREGATE RECALCULATION
# ----------------------------------------------------

def test_review_moderation(client: TestClient, db: Session, test_users, freelancer_profile, service, admin_headers):
    # Create booking
    booking = Booking(
        booking_number="B-555",
        client_id=test_users["client"].id,
        freelancer_profile_id=freelancer_profile.id,
        service_id=service.id,
        status=BookingStatus.COMPLETED,
        agreed_amount=Decimal("20000.00"),
        price=Decimal("20000.00")
    )
    db.add(booking)
    db.commit()

    # Create review
    review = Review(
        booking_id=booking.id,
        client_id=test_users["client"].id,
        freelancer_profile_id=freelancer_profile.id,
        service_id=service.id,
        overall_rating=1,
        comment="Extremely late, poor communication.",
        status=ReviewStatus.PUBLISHED,
        is_verified_booking=True
    )
    db.add(review)
    db.commit()

    # Recalculate freelancer aggregates
    RatingService.recalculate_freelancer_aggregates(db, freelancer_profile.id)
    db.refresh(freelancer_profile)
    assert freelancer_profile.average_rating == 1.0

    # Hide review via admin moderator
    client.post(f"/api/v1/admin/reviews/{review.id}/hide", headers=admin_headers)
    
    # Assert rating recalculates to None/0 since review is hidden
    db.refresh(freelancer_profile)
    assert freelancer_profile.average_rating is None
