import pytest
import os
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, VerificationStatus, FreelancerProfession
from app.models.verification import FreelancerVerification, VerificationDocument, DocumentType, DocumentStatus
from app.models.trust_badge import TrustBadge, FreelancerBadge
from app.core.security import create_token
from app.core.config import settings


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
        bio="Test creative bio details for verification.",
        experience_years=5,
        primary_profession=FreelancerProfession.VIDEOGRAPHER
    )
    db_session.add(profile)
    db_session.commit()
    db_session.refresh(profile)
    return profile


def create_dummy_upload_file(filename: str) -> str:
    # Ensure local upload dir verifications path exists
    os.makedirs(os.path.join(settings.UPLOAD_STORAGE_PATH, "verifications"), exist_ok=True)
    local_path = os.path.join(settings.UPLOAD_STORAGE_PATH, "verifications", filename)
    with open(local_path, "wb") as f:
        f.write(b"DUMMY_PDF_DATA_FOR_VERIFICATION_TEST")
    return f"/uploads/verifications/{filename}"


def test_get_verification_not_submitted(client, db):
    freelancer = create_test_user(db, "free_v1@example.com", UserRole.FREELANCER)
    profile = create_test_freelancer_profile(db, freelancer)

    token = create_token(freelancer.id, "access", role="FREELANCER")

    res = client.get(
        "/api/v1/freelancer/verification",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "NOT_SUBMITTED"
    assert res.json()["documents"] == []


def test_submit_verification_success(client, db):
    freelancer = create_test_user(db, "free_v2@example.com", UserRole.FREELANCER)
    profile = create_test_freelancer_profile(db, freelancer)
    token = create_token(freelancer.id, "access", role="FREELANCER")

    # Generate dummy file on disk
    file_path = create_dummy_upload_file("gov_id_test.pdf")

    payload = {
        "documents": [
            {
                "document_type": "IDENTITY_DOCUMENT",
                "file_path": file_path,
                "mime_type": "application/pdf"
            }
        ]
    }

    res = client.post(
        "/api/v1/freelancer/verification",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res.status_code == 201
    assert res.json()["status"] == "PENDING"

    # Verify db status changes
    db.refresh(profile)
    assert profile.verification_status == VerificationStatus.PENDING

    # Check last request in DB
    v = db.query(FreelancerVerification).filter(FreelancerVerification.freelancer_profile_id == profile.id).first()
    assert v is not None
    assert v.status == VerificationStatus.PENDING
    assert len(v.documents) == 1
    assert v.documents[0].file_path == file_path


def test_submit_verification_duplicate_blocked(client, db):
    freelancer = create_test_user(db, "free_v3@example.com", UserRole.FREELANCER)
    profile = create_test_freelancer_profile(db, freelancer)
    token = create_token(freelancer.id, "access", role="FREELANCER")

    file_path = create_dummy_upload_file("gov_id_duplicate.pdf")

    payload = {
        "documents": [
            {
                "document_type": "IDENTITY_DOCUMENT",
                "file_path": file_path,
                "mime_type": "application/pdf"
            }
        ]
    }

    # Submit first
    res1 = client.post(
        "/api/v1/freelancer/verification",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res1.status_code == 201

    # Attempt second submission
    res2 = client.post(
        "/api/v1/freelancer/verification",
        json=payload,
        headers={"Authorization": f"Bearer {token}"}
    )
    assert res2.status_code == 400
    assert "active verification request" in res2.json()["detail"].lower()


def test_admin_approves_verification(client, db):
    client_user = create_test_user(db, "admin_v@example.com", UserRole.ADMIN)
    admin_token = create_token(client_user.id, "access", role="ADMIN")

    freelancer = create_test_user(db, "free_v4@example.com", UserRole.FREELANCER)
    profile = create_test_freelancer_profile(db, freelancer)

    file_path = create_dummy_upload_file("approve_proof.pdf")

    # Create submission in DB
    v = FreelancerVerification(
        freelancer_profile_id=profile.id,
        status=VerificationStatus.PENDING
    )
    db.add(v)
    db.flush()

    doc = VerificationDocument(
        verification_id=v.id,
        document_type=DocumentType.IDENTITY_DOCUMENT,
        file_path=file_path,
        mime_type="application/pdf",
        status=DocumentStatus.PENDING
    )
    db.add(doc)
    db.commit()

    # Admin starts review
    start_res = client.post(
        f"/api/v1/admin/verifications/{v.id}/start-review",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert start_res.status_code == 200

    # Admin approves
    approve_res = client.post(
        f"/api/v1/admin/verifications/{v.id}/approve",
        json={"admin_notes": "All documents are valid."},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert approve_res.status_code == 200

    db.refresh(v)
    db.refresh(profile)
    assert v.status == VerificationStatus.VERIFIED
    assert profile.verification_status == VerificationStatus.VERIFIED

    # Check trust badge
    badge = db.query(FreelancerBadge).filter(FreelancerBadge.freelancer_profile_id == profile.id).first()
    assert badge is not None
    assert badge.is_active is True
    assert badge.badge.code == "IDENTITY_VERIFIED"


def test_admin_rejects_verification(client, db):
    client_user = create_test_user(db, "admin_v2@example.com", UserRole.ADMIN)
    admin_token = create_token(client_user.id, "access", role="ADMIN")

    freelancer = create_test_user(db, "free_v5@example.com", UserRole.FREELANCER)
    profile = create_test_freelancer_profile(db, freelancer)

    file_path = create_dummy_upload_file("reject_proof.pdf")

    # Create submission in DB
    v = FreelancerVerification(
        freelancer_profile_id=profile.id,
        status=VerificationStatus.PENDING
    )
    db.add(v)
    db.flush()

    doc = VerificationDocument(
        verification_id=v.id,
        document_type=DocumentType.IDENTITY_DOCUMENT,
        file_path=file_path,
        mime_type="application/pdf",
        status=DocumentStatus.PENDING
    )
    db.add(doc)
    db.commit()

    # Admin rejects
    reject_res = client.post(
        f"/api/v1/admin/verifications/{v.id}/reject",
        json={"reason": "ID photo is blurry.", "admin_notes": "Please ask for higher resolution scan."},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert reject_res.status_code == 200

    db.refresh(v)
    db.refresh(profile)
    assert v.status == VerificationStatus.REJECTED
    assert profile.verification_status == VerificationStatus.REJECTED
    assert v.rejection_reason == "ID photo is blurry."


def test_verification_download_idor(client, db):
    freelancer_a = create_test_user(db, "free_a@example.com", UserRole.FREELANCER)
    profile_a = create_test_freelancer_profile(db, freelancer_a)
    token_a = create_token(freelancer_a.id, "access", role="FREELANCER")

    freelancer_b = create_test_user(db, "free_b@example.com", UserRole.FREELANCER)
    profile_b = create_test_freelancer_profile(db, freelancer_b)
    token_b = create_token(freelancer_b.id, "access", role="FREELANCER")

    file_path = create_dummy_upload_file("private_file_a.pdf")

    # Create submission for Freelancer A in DB
    v_a = FreelancerVerification(
        freelancer_profile_id=profile_a.id,
        status=VerificationStatus.PENDING
    )
    db.add(v_a)
    db.flush()

    doc_a = VerificationDocument(
        verification_id=v_a.id,
        document_type=DocumentType.IDENTITY_DOCUMENT,
        file_path=file_path,
        mime_type="application/pdf",
        status=DocumentStatus.PENDING
    )
    db.add(doc_a)
    db.commit()

    # Freelancer B tries to download Freelancer A's document (403 Forbidden)
    res_b = client.get(
        f"/api/v1/freelancer/verification/documents/{doc_a.id}/download",
        headers={"Authorization": f"Bearer {token_b}"}
    )
    assert res_b.status_code == 403

    # Freelancer A successfully downloads their own document (200 OK)
    res_a = client.get(
        f"/api/v1/freelancer/verification/documents/{doc_a.id}/download",
        headers={"Authorization": f"Bearer {token_a}"}
    )
    assert res_a.status_code == 200
    assert res_a.read() == b"DUMMY_PDF_DATA_FOR_VERIFICATION_TEST"
