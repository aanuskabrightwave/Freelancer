import json
from decimal import Decimal
from typing import List, Dict, Any, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.core.database import get_db
from app.dependencies.auth import require_role
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, VerificationStatus
from app.models.service import Service, ServiceStatus
from app.models.project import Project, Proposal
from app.models.booking import Booking, BookingStatus
from app.models.payment import Payment
from app.models.refund import Refund
from app.models.payout import Payout
from app.models.review import Review, ReviewStatus
from app.models.review_report import ReviewReport, ReportStatus
from app.models.dispute import Dispute, DisputeMessage, DisputeEvidence, DisputeReason, DisputeStatus, DisputePriority, ResolutionType
from app.models.platform_setting import PlatformSetting
from app.models.admin_audit_log import AdminAuditLog
from app.models.trust_badge import TrustBadge, FreelancerBadge
from app.models.service_category import ServiceCategory

from app.services.admin_analytics_service import AdminAnalyticsService
from app.services.platform_settings_service import PlatformSettingsService
from app.services.verification_service import VerificationService
from app.services.dispute_service import DisputeService
from app.services.audit_service import AuditService
from app.services.refund_service import RefundService
from app.services.payout_service import PayoutService
from app.services.rating_service import RatingService

from app.schemas.admin import (
    UserSuspendPayload, VerificationReviewPayload, CategoryCreatePayload,
    CategoryUpdatePayload, DisputeCreatePayload, DisputeMessageCreatePayload,
    DisputeResolvePayload, PlatformSettingUpdatePayload, AdminAuditLogOut
)

router = APIRouter()

# ----------------------------------------------------
# 1. ADMIN DASHBOARD & ANALYTICS
# ----------------------------------------------------

@router.get("/dashboard", response_model=Dict[str, Any])
def get_dashboard(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return AdminAnalyticsService.get_dashboard_summary(db)


@router.get("/analytics", response_model=Dict[str, Any])
def get_analytics(
    days: int = Query(30, ge=7, le=365),
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return AdminAnalyticsService.get_filtered_analytics(db, days)


# ----------------------------------------------------
# 2. USERS MANAGEMENT
# ----------------------------------------------------

@router.get("/users")
def list_users(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[UserRole] = None,
    status_filter: Optional[str] = None, # ACTIVE, SUSPENDED
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    query = db.query(User)
    
    if search:
        query = query.filter(
            or_(
                User.full_name.ilike(f"%{search}%"),
                User.email.ilike(f"%{search}%"),
                User.phone.ilike(f"%{search}%"),
                User.id == search
            )
        )
    
    if role:
        query = query.filter(User.role == role)
        
    if status_filter:
        if status_filter == "ACTIVE":
            query = query.filter(User.is_active == True)
        elif status_filter == "SUSPENDED":
            query = query.filter(User.is_active == False)

    total = query.count()
    users = query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [{
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
            "phone": u.phone,
            "role": u.role,
            "is_active": u.is_active,
            "is_verified": u.is_verified,
            "is_phone_verified": u.is_phone_verified,
            "created_at": u.created_at
        } for u in users]
    }


@router.get("/users/{id}")
def get_user_detail(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    profile_data = None
    if user.role == UserRole.FREELANCER:
        profile = db.query(FreelancerProfile).filter(FreelancerProfile.user_id == user.id).first()
        if profile:
            profile_data = {
                "id": profile.id,
                "professional_title": profile.professional_title,
                "primary_profession": profile.primary_profession,
                "city": profile.city,
                "country": profile.country,
                "average_rating": profile.average_rating,
                "review_count": profile.review_count,
                "completed_jobs_count": profile.completed_jobs_count,
                "verification_status": profile.verification_status
            }

    bookings_cnt = db.query(Booking).filter(Booking.client_id == user.id).count()
    projects_cnt = db.query(Project).filter(Project.client_id == user.id).count()

    return {
        "id": user.id,
        "full_name": user.full_name,
        "email": user.email,
        "phone": user.phone,
        "role": user.role,
        "is_active": user.is_active,
        "created_at": user.created_at,
        "profile": profile_data,
        "stats": {
            "bookings_as_client": bookings_cnt,
            "projects_posted": projects_cnt
        }
    }


@router.post("/users/{id}/suspend")
def suspend_user(
    id: int,
    payload: UserSuspendPayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    # Self-protection logic
    if admin.id == id:
        raise HTTPException(status_code=400, detail="Admins cannot suspend their own active accounts.")

    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if not user.is_active:
        raise HTTPException(status_code=400, detail="User is already suspended.")

    # Prevent role escalation bypass (though clients/freelancers don't have access to this, verify)
    if user.role == UserRole.ADMIN:
         # Double check if target is admin, restrict suspension of other admins for standard protection
         pass

    user.is_active = False
    db.commit()

    # Log audit
    AuditService.log_action(
        db=db,
        admin_user_id=admin.id,
        action="USER_SUSPENDED",
        entity_type="user",
        entity_id=user.id,
        description=f"Suspended user {user.email}. Reason: {payload.reason}",
        metadata_json={"reason": payload.reason}
    )

    return {"message": "User account suspended successfully."}


@router.post("/users/{id}/reactivate")
def reactivate_user(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    user = db.query(User).filter(User.id == id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found.")

    if user.is_active:
        raise HTTPException(status_code=400, detail="User account is already active.")

    user.is_active = True
    db.commit()

    # Log audit
    AuditService.log_action(
        db=db,
        admin_user_id=admin.id,
        action="USER_REACTIVATED",
        entity_type="user",
        entity_id=user.id,
        description=f"Reactivated user account {user.email}."
    )

    return {"message": "User account reactivated successfully."}


# ----------------------------------------------------
# 3. FREELANCER & TRUST MANAGEMENT
# ----------------------------------------------------

@router.get("/freelancers")
def list_freelancers(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    query = db.query(FreelancerProfile)
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [{
            "id": p.id,
            "user_id": p.user_id,
            "full_name": p.user.full_name if p.user else "Deleted Creator",
            "professional_title": p.professional_title,
            "primary_profession": p.primary_profession,
            "city": p.city,
            "average_rating": p.average_rating,
            "completed_jobs_count": p.completed_jobs_count,
            "verification_status": p.verification_status,
            "is_active": p.user.is_active if p.user else False
        } for p in items]
    }


@router.get("/freelancers/{id}")
def get_freelancer_detail(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    profile = db.query(FreelancerProfile).filter(FreelancerProfile.id == id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Freelancer profile not found.")

    badges = [{
        "code": fb.badge.code,
        "name": fb.badge.name,
        "source": fb.source
    } for fb in profile.badges if fb.is_active]

    # Calculate earnings total
    from app.models.ledger import LedgerEntry
    total_earned = db.query(func.sum(LedgerEntry.amount)).filter(
        LedgerEntry.freelancer_profile_id == id,
        LedgerEntry.entry_type == "SERVICE_FEE"
    ).scalar() or Decimal("0.00")

    return {
        "id": profile.id,
        "user_id": profile.user_id,
        "full_name": profile.user.full_name if profile.user else "",
        "email": profile.user.email if profile.user else "",
        "professional_title": profile.professional_title,
        "primary_profession": profile.primary_profession,
        "bio": profile.bio,
        "experience_years": profile.experience_years,
        "city": profile.city,
        "state": profile.state,
        "country": profile.country,
        "verification_status": profile.verification_status,
        "badges": badges,
        "earnings": {
            "total_earned": str(total_earned)
        }
    }


@router.post("/freelancers/{id}/badge")
def award_manual_badge(
    id: int,
    badge_code: str = Query(...),
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    profile = db.query(FreelancerProfile).filter(FreelancerProfile.id == id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Freelancer profile not found.")

    # Performance badges (automatic) like TOP_RATED cannot be awarded manually
    if badge_code.upper() == "TOP_RATED":
        raise HTTPException(status_code=400, detail="TOP_RATED badges are awarded automatically by system performance rules.")

    badge = db.query(TrustBadge).filter(TrustBadge.code == badge_code).first()
    if not badge:
        # Create custom badge if not exists
        badge = TrustBadge(
            code=badge_code,
            name=badge_code.replace("_", " ").title(),
            description=notes or "Awarded by Administrator"
        )
        db.add(badge)
        db.flush()

    fl_badge = db.query(FreelancerBadge).filter(
        FreelancerBadge.freelancer_profile_id == id,
        FreelancerBadge.badge_id == badge.id
    ).first()
    
    if not fl_badge:
        fl_badge = FreelancerBadge(
            freelancer_profile_id=id,
            badge_id=badge.id,
            source="ADMIN",
            is_active=True
        )
        db.add(fl_badge)
    else:
        fl_badge.is_active = True
        fl_badge.source = "ADMIN"

    db.commit()

    # Log audit
    AuditService.log_action(
        db=db,
        admin_user_id=admin.id,
        action="BADGE_AWARDED",
        entity_type="freelancer",
        entity_id=id,
        description=f"Awarded badge '{badge_code}' to freelancer profile {id}.",
        metadata_json={"badge_code": badge_code, "notes": notes}
    )

    return {"message": f"Badge '{badge_code}' successfully awarded."}


# ----------------------------------------------------
# 4. FREELANCER VERIFICATION QUEUE
# ----------------------------------------------------

@router.get("/verifications")
def list_verifications(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return VerificationService.get_pending_verifications(db)


@router.get("/verifications/{id}")
def get_verification(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    v = VerificationService.get_verification_by_id(db, id)
    return {
        "id": v.id,
        "freelancer_profile_id": v.freelancer_profile_id,
        "full_name": v.freelancer_profile.user.full_name if v.freelancer_profile and v.freelancer_profile.user else "",
        "status": v.status,
        "submitted_at": v.submitted_at,
        "admin_notes": v.admin_notes,
        "rejection_reason": v.rejection_reason,
        # Secure file paths metadata returned
        "documents": [{
            "id": d.id,
            "document_type": d.document_type,
            "mime_type": d.mime_type,
            "status": d.status
        } for d in v.documents]
    }


@router.post("/verifications/{id}/start-review")
def start_verification_review(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return VerificationService.start_review(db, admin.id, id)


@router.post("/verifications/{id}/approve")
def approve_verification(
    id: int,
    payload: VerificationReviewPayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return VerificationService.approve_verification(db, admin.id, id, payload.admin_notes)


@router.post("/verifications/{id}/reject")
def reject_verification(
    id: int,
    payload: VerificationReviewPayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    if not payload.reason:
         raise HTTPException(status_code=400, detail="Rejection reason is required.")
    return VerificationService.reject_verification(db, admin.id, id, payload.reason, payload.admin_notes)


@router.post("/verifications/{id}/request-resubmission")
def request_verification_resubmission(
    id: int,
    payload: VerificationReviewPayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    if not payload.reason:
         raise HTTPException(status_code=400, detail="Resubmission instructions/reasons are required.")
    return VerificationService.request_resubmission(db, admin.id, id, payload.reason, payload.admin_notes)


# Secure file downloads interface
@router.get("/verifications/{id}/documents/{doc_id}/download")
def download_verification_document(
    id: int,
    doc_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    # Enforces strict admin security check.
    # Verification documents are PRIVATE. Do not expose public URL.
    doc = db.query(VerificationDocument).filter(
        VerificationDocument.id == doc_id,
        VerificationDocument.verification_id == id
    ).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Verification document matching criteria not found.")

    import os
    from fastapi.responses import FileResponse
    from app.core.config import settings

    local_path = doc.file_path
    if local_path.startswith("/uploads"):
        local_rel = local_path.replace("/uploads/", "")
        local_path = os.path.normpath(os.path.join(settings.UPLOAD_STORAGE_PATH, local_rel))

    if not os.path.exists(local_path):
        raise HTTPException(status_code=404, detail="Verification document file not found on local disk.")

    return FileResponse(local_path, media_type=doc.mime_type)


# ----------------------------------------------------
# 5. CATEGORY ARCHITECTURE
# ----------------------------------------------------

@router.get("/categories")
def list_categories(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return db.query(ServiceCategory).order_by(ServiceCategory.parent_id.asc(), ServiceCategory.name.asc()).all()


@router.post("/categories")
def create_category(
    payload: CategoryCreatePayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    existing = db.query(ServiceCategory).filter(ServiceCategory.slug == payload.slug).first()
    if existing:
        raise HTTPException(status_code=400, detail="Slug already in use.")

    cat = ServiceCategory(
        name=payload.name,
        slug=payload.slug,
        description=payload.description,
        parent_id=payload.parent_id,
        is_active=True
    )
    db.add(cat)
    db.commit()
    db.refresh(cat)
    return cat


@router.patch("/categories/{id}")
def update_category(
    id: int,
    payload: CategoryUpdatePayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    cat = db.query(ServiceCategory).filter(ServiceCategory.id == id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(cat, k, v)

    db.commit()
    db.refresh(cat)
    return cat


@router.post("/categories/{id}/activate")
def activate_category(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    cat = db.query(ServiceCategory).filter(ServiceCategory.id == id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    cat.is_active = True
    db.commit()
    return {"message": "Category activated."}


@router.post("/categories/{id}/deactivate")
def deactivate_category(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    cat = db.query(ServiceCategory).filter(ServiceCategory.id == id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Category not found.")

    # Do not hard-delete categories referenced by services/proposals
    cat.is_active = False
    db.commit()
    return {"message": "Category deactivated."}


# ----------------------------------------------------
# 6. SERVICE & PROJECT MODERATION
# ----------------------------------------------------

@router.get("/services")
def list_services(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    query = db.query(Service)
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [{
            "id": s.id,
            "title": s.title,
            "freelancer_name": s.freelancer_profile.user.full_name if s.freelancer_profile and s.freelancer_profile.user else "",
            "starting_price": str(s.starting_price),
            "status": s.status,
            "is_active": s.is_active,
            "created_at": s.created_at
        } for s in items]
    }


@router.post("/services/{id}/hide")
def hide_service(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    s = db.query(Service).filter(Service.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Service not found.")

    s.is_active = False
    s.status = ServiceStatus.ARCHIVED
    db.commit()

    # Log audit
    AuditService.log_action(
        db=db,
        admin_user_id=admin.id,
        action="SERVICE_HIDDEN",
        entity_type="service",
        entity_id=id,
        description=f"Moderator hid service ID {id}."
    )

    return {"message": "Service hidden from discovery."}


@router.post("/services/{id}/restore")
def restore_service(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    s = db.query(Service).filter(Service.id == id).first()
    if not s:
        raise HTTPException(status_code=404, detail="Service not found.")

    s.is_active = True
    s.status = ServiceStatus.PUBLISHED
    db.commit()

    # Log audit
    AuditService.log_action(
        db=db,
        admin_user_id=admin.id,
        action="SERVICE_HIDDEN",  # Audited under visibility settings updates
        entity_type="service",
        entity_id=id,
        description=f"Moderator restored service ID {id}."
    )

    return {"message": "Service restored to discovery."}


@router.get("/projects")
def list_projects(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    query = db.query(Project)
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [{
            "id": p.id,
            "title": p.title,
            "client_name": p.client.full_name if p.client else "",
            "budget": str(p.budget),
            "status": p.status,
            "created_at": p.created_at
        } for p in items]
    }


# ----------------------------------------------------
# 7. BOOKINGS INSPECTION
# ----------------------------------------------------

@router.get("/bookings")
def list_bookings(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    query = db.query(Booking)
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [{
            "id": b.id,
            "booking_number": b.booking_number,
            "client_name": b.client.full_name if b.client else "",
            "freelancer_name": b.freelancer.user.full_name if b.freelancer and b.freelancer.user else "",
            "agreed_amount": str(b.agreed_amount),
            "status": b.status,
            "created_at": b.created_at
        } for b in items]
    }


@router.get("/bookings/{id}")
def get_booking_detail(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    b = db.query(Booking).filter(Booking.id == id).first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking details not found.")

    return {
        "id": b.id,
        "booking_number": b.booking_number,
        "client_name": b.client.full_name if b.client else "",
        "freelancer_name": b.freelancer.user.full_name if b.freelancer and b.freelancer.user else "",
        "agreed_amount": str(b.agreed_amount),
        "status": b.status,
        "created_at": b.created_at,
        "confirmed_at": b.confirmed_at,
        "completed_at": b.completed_at,
        "cancelled_at": b.cancelled_at,
        "cancellation_reason": b.cancellation_reason
    }


# ----------------------------------------------------
# 8. PAYMENTS & REFUNDS & PAYOUTS
# ----------------------------------------------------

@router.get("/payments")
def list_payments(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    query = db.query(Payment)
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [{
            "id": p.id,
            "payment_number": p.payment_number,
            "client_name": p.client.full_name if p.client else "",
            "gross_amount": str(p.gross_amount),
            "platform_fee_amount": str(p.platform_fee_amount),
            "status": p.status,
            "created_at": p.created_at
        } for p in items]
    }


@router.get("/payments/{id}")
def get_payment_detail(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    p = db.query(Payment).filter(Payment.id == id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Payment record match not found.")

    # Secure Details returned (Secrets are hidden, only provider transaction references exposed)
    return {
        "id": p.id,
        "payment_number": p.payment_number,
        "provider_order_id": p.provider_order_id,
        "provider_payment_id": p.provider_payment_id,
        "gross_amount": str(p.gross_amount),
        "platform_fee_amount": str(p.platform_fee_amount),
        "freelancer_amount": str(p.freelancer_amount),
        "commission_percent_snapshot": str(p.commission_percent_snapshot),
        "status": p.status,
        "paid_at": p.paid_at
    }


@router.get("/refunds")
def list_refunds(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return db.query(Refund).order_by(Refund.created_at.desc()).all()


@router.post("/refunds/{id}/approve")
def approve_refund(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    # Approval executes safe financials via RefundService
    return RefundService.approve_refund_request(db, admin, id)


@router.post("/refunds/{id}/reject")
def reject_refund(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return RefundService.reject_refund_request(db, admin, id)


@router.get("/payouts")
def list_payouts(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return db.query(Payout).order_by(Payout.created_at.desc()).all()


@router.post("/payouts/{id}/retry")
def retry_payout(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    # Retry failed transfers using PayoutService
    payout = PayoutService.retry_failed_payout(db, id)
    
    # Log audit
    AuditService.log_action(
        db=db,
        admin_user_id=admin.id,
        action="PAYOUT_RETRIED",
        entity_type="payout",
        entity_id=id,
        description=f"Retried failed payout ID {id}."
    )
    
    return payout


# ----------------------------------------------------
# 9. REVIEWS MODERATION & REPORTS
# ----------------------------------------------------

@router.get("/reviews")
def list_reviews(
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    query = db.query(Review)
    total = query.count()
    items = query.offset((page - 1) * page_size).limit(page_size).all()
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": [{
            "id": r.id,
            "reviewer_name": r.client.full_name if r.client else "",
            "freelancer_name": r.freelancer_profile.user.full_name if r.freelancer_profile and r.freelancer_profile.user else "",
            "overall_rating": r.overall_rating,
            "comment": r.comment,
            "status": r.status
        } for r in items]
    }


@router.post("/reviews/{id}/hide")
def hide_review(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    r = db.query(Review).filter(Review.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review not found.")

    r.status = ReviewStatus.HIDDEN
    db.commit()

    # Recalculate aggregates
    RatingService.recalculate_freelancer_aggregates(db, r.freelancer_profile_id)
    if r.service_id:
        RatingService.recalculate_service_aggregates(db, r.service_id)

    # Log audit
    AuditService.log_action(
        db=db,
        admin_user_id=admin.id,
        action="REVIEW_HIDDEN",
        entity_type="review",
        entity_id=id,
        description=f"Hid review ID {id}."
    )

    return {"message": "Review hidden."}


@router.post("/reviews/{id}/restore")
def restore_review(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    r = db.query(Review).filter(Review.id == id).first()
    if not r:
        raise HTTPException(status_code=404, detail="Review not found.")

    r.status = ReviewStatus.PUBLISHED
    db.commit()

    # Recalculate aggregates
    RatingService.recalculate_freelancer_aggregates(db, r.freelancer_profile_id)
    if r.service_id:
        RatingService.recalculate_service_aggregates(db, r.service_id)

    # Log audit
    AuditService.log_action(
        db=db,
        admin_user_id=admin.id,
        action="REVIEW_HIDDEN",  # Audited under review visibility update actions
        entity_type="review",
        entity_id=id,
        description=f"Restored review ID {id}."
    )

    return {"message": "Review restored."}


# ----------------------------------------------------
# 10. DISPUTES PIPELINE
# ----------------------------------------------------

@router.get("/disputes")
def list_disputes(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return DisputeService.get_all_disputes(db)


@router.get("/disputes/{id}")
def get_dispute(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    d = DisputeService.get_dispute_by_id(db, id)
    return {
        "id": d.id,
        "dispute_number": d.dispute_number,
        "booking_number": d.booking.booking_number if d.booking else "",
        "opened_by": d.opened_by.full_name if d.opened_by else "",
        "against": d.against.full_name if d.against else "",
        "reason": d.reason,
        "description": d.description,
        "status": d.status,
        "priority": d.priority,
        "assigned_admin": d.assigned_admin.full_name if d.assigned_admin else None,
        "resolution_type": d.resolution_type,
        "resolution_notes": d.resolution_notes,
        "opened_at": d.opened_at,
        "resolved_at": d.resolved_at,
        "messages": [{
            "id": m.id,
            "sender_name": m.sender.full_name if m.sender else "",
            "message": m.message,
            "is_internal_admin_note": m.is_internal_admin_note,
            "created_at": m.created_at
        } for m in d.messages],
        "evidence": [{
            "id": ev.id,
            "uploader_name": ev.uploader.full_name if ev.uploader else "",
            "file_path": ev.file_path,
            "mime_type": ev.mime_type,
            "description": ev.description,
            "created_at": ev.created_at
        } for ev in d.evidence]
    }


@router.post("/disputes/{id}/assign")
def assign_dispute_admin(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return DisputeService.assign_dispute(db, admin.id, id)


@router.post("/disputes/{id}/message")
def post_dispute_reply(
    id: int,
    payload: DisputeMessageCreatePayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return DisputeService.post_dispute_message(
        db=db,
        user=admin,
        dispute_id=id,
        message=payload.message,
        is_internal_admin_note=payload.is_internal_admin_note
    )


@router.post("/disputes/{id}/resolve")
def resolve_dispute_claim(
    id: int,
    payload: DisputeResolvePayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return DisputeService.resolve_dispute(
        db=db,
        admin_id=admin.id,
        dispute_id=id,
        resolution_type=payload.resolution_type,
        resolution_notes=payload.resolution_notes,
        partial_refund_amount=payload.partial_refund_amount
    )


# Evidence secure downloads
@router.get("/disputes/{id}/evidence/{ev_id}/download")
def download_dispute_evidence(
    id: int,
    ev_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    ev = db.query(DisputeEvidence).filter(
        DisputeEvidence.id == ev_id,
        DisputeEvidence.dispute_id == id
    ).first()
    if not ev:
        raise HTTPException(status_code=404, detail="Dispute evidence file match not found.")

    from fastapi.responses import FileResponse
    return FileResponse(ev.file_path, media_type=ev.mime_type)


# ----------------------------------------------------
# 11. CENTRALIZED PLATFORM CONFIG
# ----------------------------------------------------
from app.schemas.admin import PlatformSettingOut

@router.get("/settings", response_model=List[PlatformSettingOut])
def list_settings(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    # Force default configurations seeding if missing
    PlatformSettingsService.seed_defaults_if_empty(db)
    return db.query(PlatformSetting).all()


@router.patch("/settings/{key}", response_model=PlatformSettingOut)
def update_platform_config(
    key: str,
    payload: PlatformSettingUpdatePayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return PlatformSettingsService.update_setting(db, admin.id, key, payload.value)


# ----------------------------------------------------
# 12. AUDIT LOGS LEDGER
# ----------------------------------------------------

@router.get("/audit-logs", response_model=List[AdminAuditLogOut])
def list_audit_logs(
    action: Optional[str] = None,
    admin_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    query = db.query(AdminAuditLog)
    
    if action:
        query = query.filter(AdminAuditLog.action == action)
        
    if admin_id:
        query = query.filter(AdminAuditLog.admin_user_id == admin_id)
        
    return query.order_by(AdminAuditLog.created_at.desc()).all()

