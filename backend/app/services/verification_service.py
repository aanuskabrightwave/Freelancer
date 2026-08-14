from datetime import datetime
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException, status

from app.models.freelancer_profile import FreelancerProfile, VerificationStatus
from app.models.verification import FreelancerVerification, VerificationDocument, DocumentType, DocumentStatus
from app.models.trust_badge import TrustBadge, FreelancerBadge
from app.models.user import User
from app.services.audit_service import AuditService
from app.services.notification_service import NotificationService


class VerificationService:
    @staticmethod
    def get_pending_verifications(db: Session) -> List[FreelancerVerification]:
        return db.query(FreelancerVerification).filter(
            FreelancerVerification.status.in_([VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW])
        ).all()

    @staticmethod
    def get_verification_by_id(db: Session, verification_id: int) -> FreelancerVerification:
        v = db.query(FreelancerVerification).filter(FreelancerVerification.id == verification_id).first()
        if not v:
            raise HTTPException(status_code=404, detail="Verification request not found.")
        return v

    @staticmethod
    def get_verification_by_freelancer_id(db: Session, freelancer_id: int) -> Optional[FreelancerVerification]:
        return db.query(FreelancerVerification).filter(
            FreelancerVerification.freelancer_profile_id == freelancer_id
        ).order_by(FreelancerVerification.created_at.desc()).first()

    @staticmethod
    def submit_verification(
        db: Session,
        freelancer_profile_id: int,
        documents_list: List[Dict[str, str]]
    ) -> FreelancerVerification:
        # Check active requests
        active = db.query(FreelancerVerification).filter(
            FreelancerVerification.freelancer_profile_id == freelancer_profile_id,
            FreelancerVerification.status.in_([VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW])
        ).first()
        if active:
            raise HTTPException(status_code=400, detail="You already have an active verification request in review.")

        # Create verification record
        verification = FreelancerVerification(
            freelancer_profile_id=freelancer_profile_id,
            status=VerificationStatus.PENDING
        )
        db.add(verification)
        db.flush()

        # Add documents
        for doc in documents_list:
            db_doc = VerificationDocument(
                verification_id=verification.id,
                document_type=doc["document_type"],
                file_path=doc["file_path"],
                mime_type=doc["mime_type"],
                status=DocumentStatus.PENDING
            )
            db.add(db_doc)

        # Update profile status
        profile = db.query(FreelancerProfile).filter(FreelancerProfile.id == freelancer_profile_id).first()
        if profile:
            profile.verification_status = VerificationStatus.PENDING

        db.commit()
        db.refresh(verification)
        return verification

    @staticmethod
    def start_review(db: Session, admin_id: int, verification_id: int) -> FreelancerVerification:
        v = VerificationService.get_verification_by_id(db, verification_id)
        if v.status != VerificationStatus.PENDING:
            raise HTTPException(status_code=400, detail="Only pending requests can be reviewed.")

        v.status = VerificationStatus.UNDER_REVIEW
        v.reviewed_by_admin_id = admin_id
        
        # Update freelancer profile status
        profile = db.query(FreelancerProfile).filter(FreelancerProfile.id == v.freelancer_profile_id).first()
        if profile:
            profile.verification_status = VerificationStatus.UNDER_REVIEW

        db.commit()
        db.refresh(v)
        return v

    @staticmethod
    def approve_verification(db: Session, admin_id: int, verification_id: int, admin_notes: Optional[str] = None) -> FreelancerVerification:
        v = VerificationService.get_verification_by_id(db, verification_id)
        if v.status not in (VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW):
            raise HTTPException(status_code=400, detail="Verification request is already closed.")

        # Update verification statuses
        v.status = VerificationStatus.VERIFIED
        v.reviewed_by_admin_id = admin_id
        v.reviewed_at = datetime.now()
        v.admin_notes = admin_notes
        for doc in v.documents:
            doc.status = DocumentStatus.APPROVED

        # Update freelancer profile
        profile = db.query(FreelancerProfile).filter(FreelancerProfile.id == v.freelancer_profile_id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Associated freelancer profile not found.")
        profile.verification_status = VerificationStatus.VERIFIED

        # Award trust badge: IDENTITY_VERIFIED
        badge = db.query(TrustBadge).filter(TrustBadge.code == "IDENTITY_VERIFIED").first()
        if not badge:
            badge = TrustBadge(
                code="IDENTITY_VERIFIED",
                name="Identity Verified",
                description="Identity verified by the administration team.",
                icon="shield-check"
            )
            db.add(badge)
            db.flush()

        # Check existing badge award
        fl_badge = db.query(FreelancerBadge).filter(
            FreelancerBadge.freelancer_profile_id == profile.id,
            FreelancerBadge.badge_id == badge.id
        ).first()
        if not fl_badge:
            fl_badge = FreelancerBadge(
                freelancer_profile_id=profile.id,
                badge_id=badge.id,
                source="ADMIN",
                is_active=True
            )
            db.add(fl_badge)
        else:
            fl_badge.is_active = True

        db.commit()
        db.refresh(v)

        # Log audit action
        AuditService.log_action(
            db=db,
            admin_user_id=admin_id,
            action="VERIFICATION_APPROVED",
            entity_type="freelancer_verification",
            entity_id=v.id,
            description=f"Approved verification request for profile {v.freelancer_profile_id}.",
            metadata_json={"freelancer_id": v.freelancer_profile_id}
        )

        # Notify freelancer
        try:
            NotificationService.dispatch(
                db=db,
                recipient_id=profile.user_id,
                event_code="PROFILE_VERIFICATION_UPDATE",
                title="Profile Verified!",
                message="Your identity verification documents have been approved. You now have the Identity Verified shield badge on your profile.",
                action_url=f"/freelancer/profile",
                entity_type="verification",
                entity_id=v.id,
                deduplication_key=f"verification:{v.id}:approved:user:{profile.user_id}"
            )
        except Exception:
            pass

        return v

    @staticmethod
    def reject_verification(
        db: Session,
        admin_id: int,
        verification_id: int,
        reason: str,
        admin_notes: Optional[str] = None
    ) -> FreelancerVerification:
        v = VerificationService.get_verification_by_id(db, verification_id)
        if v.status not in (VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW):
            raise HTTPException(status_code=400, detail="Verification request is already closed.")

        if not reason.strip():
            raise HTTPException(status_code=400, detail="Rejection reason is required.")

        # Update verification statuses
        v.status = VerificationStatus.REJECTED
        v.reviewed_by_admin_id = admin_id
        v.reviewed_at = datetime.now()
        v.rejection_reason = reason
        v.admin_notes = admin_notes
        for doc in v.documents:
            doc.status = DocumentStatus.REJECTED

        # Update freelancer profile
        profile = db.query(FreelancerProfile).filter(FreelancerProfile.id == v.freelancer_profile_id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Associated freelancer profile not found.")
        profile.verification_status = VerificationStatus.REJECTED

        # Deactivate trust badge if awarded
        badge = db.query(TrustBadge).filter(TrustBadge.code == "IDENTITY_VERIFIED").first()
        if badge:
            fl_badge = db.query(FreelancerBadge).filter(
                FreelancerBadge.freelancer_profile_id == profile.id,
                FreelancerBadge.badge_id == badge.id
            ).first()
            if fl_badge:
                fl_badge.is_active = False

        db.commit()
        db.refresh(v)

        # Log audit action
        AuditService.log_action(
            db=db,
            admin_user_id=admin_id,
            action="VERIFICATION_REJECTED",
            entity_type="freelancer_verification",
            entity_id=v.id,
            description=f"Rejected verification request for profile {v.freelancer_profile_id} with reason: '{reason}'.",
            metadata_json={"freelancer_id": v.freelancer_profile_id, "reason": reason}
        )

        # Notify freelancer
        try:
            NotificationService.dispatch(
                db=db,
                recipient_id=profile.user_id,
                event_code="PROFILE_VERIFICATION_UPDATE",
                title="Verification Rejected",
                message=f"Your profile verification request was rejected. Reason: {reason}",
                action_url=f"/freelancer/profile",
                entity_type="verification",
                entity_id=v.id,
                deduplication_key=f"verification:{v.id}:rejected:user:{profile.user_id}"
            )
        except Exception:
            pass

        return v

    @staticmethod
    def request_resubmission(
        db: Session,
        admin_id: int,
        verification_id: int,
        reason: str,
        admin_notes: Optional[str] = None
    ) -> FreelancerVerification:
        v = VerificationService.get_verification_by_id(db, verification_id)
        if v.status not in (VerificationStatus.PENDING, VerificationStatus.UNDER_REVIEW):
            raise HTTPException(status_code=400, detail="Verification request is already closed.")

        if not reason.strip():
            raise HTTPException(status_code=400, detail="Resubmission reason is required.")

        # Update verification status
        v.status = VerificationStatus.RESUBMISSION_REQUIRED
        v.reviewed_by_admin_id = admin_id
        v.reviewed_at = datetime.now()
        v.rejection_reason = reason
        v.admin_notes = admin_notes

        # Update profile status
        profile = db.query(FreelancerProfile).filter(FreelancerProfile.id == v.freelancer_profile_id).first()
        if profile:
            profile.verification_status = VerificationStatus.RESUBMISSION_REQUIRED

        db.commit()
        db.refresh(v)

        # Log audit action
        AuditService.log_action(
            db=db,
            admin_user_id=admin_id,
            action="VERIFICATION_REJECTED",  # Audited under rejected action type
            entity_type="freelancer_verification",
            entity_id=v.id,
            description=f"Requested resubmission for profile {v.freelancer_profile_id} with reason: '{reason}'.",
            metadata_json={"freelancer_id": v.freelancer_profile_id, "reason": reason}
        )

        # Notify freelancer
        try:
            NotificationService.dispatch(
                db=db,
                recipient_id=profile.user_id,
                event_code="PROFILE_VERIFICATION_UPDATE",
                title="Resubmission Required",
                message=f"Additional verification files are required. Reason: {reason}",
                action_url="/freelancer/profile",
                entity_type="verification",
                entity_id=v.id,
                deduplication_key=f"verification:{v.id}:resubmit:user:{profile.user_id}"
            )
        except Exception:
            pass

        return v
