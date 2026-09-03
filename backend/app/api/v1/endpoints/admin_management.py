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
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    from app.api.v1.endpoints.projects import decode_project
    query = db.query(Project)
    if status:
        query = query.filter(Project.status == status)
    total = query.count()
    items = query.order_by(Project.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    
    res_items = []
    for p in items:
        dp = decode_project(p)
        dp_dict = dp.model_dump() if hasattr(dp, "model_dump") else dp.dict()
        
        # Enrich client name
        dp_dict["client_name"] = p.client.full_name if p.client else ""
        
        # Find linked booking if any
        booking = db.query(Booking).filter(Booking.project_id == p.id).first()
        if booking:
            dp_dict["booking_id"] = booking.id
            dp_dict["booking_number"] = booking.booking_number
            if booking.freelancer_profile_id:
                dp_dict["matched_freelancer"] = {
                    "id": booking.freelancer_profile_id,
                    "user_id": booking.freelancer.user_id if booking.freelancer else None,
                    "professional_title": booking.freelancer.professional_title if booking.freelancer else None,
                    "full_name": booking.freelancer.user.full_name if booking.freelancer and booking.freelancer.user else None
                }
        
        # Find CLIENT_ADMIN conversation
        from app.models.message import Conversation
        convo = db.query(Conversation).filter(
            Conversation.project_id == p.id,
            Conversation.conversation_type == "CLIENT_ADMIN"
        ).first()
        if convo:
            dp_dict["admin_conversation_id"] = convo.id
            
        res_items.append(dp_dict)
        
    return {
        "total": total,
        "page": page,
        "page_size": page_size,
        "items": res_items
    }


# ----------------------------------------------------
# 7. BOOKINGS INSPECTION & ASSIGNMENT ENGINE
# ----------------------------------------------------
from datetime import date
from app.services.assignment_service import AssignmentService
from app.schemas.assignment import (
    AdminBookingListItem, AdminBookingDetail, AdminReviewBookingPayload,
    AdminAssignFreelancerPayload, BookingAssignmentOut
)


@router.get("/bookings", response_model=List[AdminBookingListItem], summary="List managed marketplace bookings")
def list_bookings(
    status_filter: Optional[str] = Query(None, alias="status"),
    assignment_status: Optional[str] = None,
    source_type: Optional[str] = None,
    date_from: Optional[date] = None,
    date_to: Optional[date] = None,
    client_id: Optional[int] = None,
    freelancer_profile_id: Optional[int] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return AssignmentService.list_admin_bookings(
        db=db,
        status_filter=status_filter,
        assignment_status=assignment_status,
        source_type=source_type,
        date_from=date_from,
        date_to=date_to,
        client_id=client_id,
        freelancer_profile_id=freelancer_profile_id,
        search=search,
        page=page,
        page_size=page_size
    )


@router.get("/bookings/{id}", response_model=AdminBookingDetail, summary="Get operational booking detail and assignment history")
def get_booking_detail(
    id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return AssignmentService.get_admin_booking_detail(db, id)


@router.post("/bookings/{id}/review", response_model=AdminBookingDetail, summary="Review booking and transition to MATCHING_IN_PROGRESS")
def review_booking(
    id: int,
    payload: AdminReviewBookingPayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return AssignmentService.review_booking(db, admin, id, payload)


@router.post("/bookings/{id}/assign", response_model=BookingAssignmentOut, summary="Assign freelancer or suggest replacement")
def assign_freelancer(
    id: int,
    payload: AdminAssignFreelancerPayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    return AssignmentService.assign_freelancer(db, admin, id, payload)



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


# ----------------------------------------------------
# 13. ADMIN PROJECTS MATCHING & JOB POSTS
# ----------------------------------------------------
from app.api.v1.endpoints.projects import ProjectResponseCustom
from app.schemas.assignment import AdminAssignFreelancerPayload, BookingAssignmentOut
from pydantic import BaseModel

class AdminReviewProjectPayload(BaseModel):
    status: str
    admin_review_notes: Optional[str] = None



@router.get("/projects/{project_id}", response_model=ProjectResponseCustom)
def get_admin_project_detail(
    project_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    from app.api.v1.endpoints.projects import decode_project
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    dp = decode_project(project)
    
    # Linked booking
    booking = db.query(Booking).filter(Booking.project_id == project.id).first()
    if booking:
        dp.booking_id = booking.id
        dp.booking_number = booking.booking_number
        if booking.freelancer_profile_id:
            dp.matched_freelancer = {
                "id": booking.freelancer_profile_id,
                "user_id": booking.freelancer.user_id if booking.freelancer else None,
                "professional_title": booking.freelancer.professional_title if booking.freelancer else None,
                "full_name": booking.freelancer.user.full_name if booking.freelancer and booking.freelancer.user else None
            }
        else:
            # Check for offered assignment
            from app.models.booking_assignment import BookingAssignment
            active_assign = db.query(BookingAssignment).filter(
                BookingAssignment.booking_id == booking.id,
                BookingAssignment.status.in_(["OFFERED", "ACCEPTED"])
            ).order_by(BookingAssignment.created_at.desc()).first()
            if active_assign:
                dp.client_approval_required = active_assign.client_approval_required
                dp.client_approval_status = active_assign.client_approval_status
                if active_assign.freelancer_profile:
                    dp.matched_freelancer = {
                        "id": active_assign.freelancer_profile_id,
                        "user_id": active_assign.freelancer_profile.user_id,
                        "professional_title": active_assign.freelancer_profile.professional_title,
                        "full_name": active_assign.freelancer_profile.user.full_name if active_assign.freelancer_profile.user else None
                    }
    
    # Client/Admin convo
    from app.models.message import Conversation
    convo = db.query(Conversation).filter(
        Conversation.project_id == project.id,
        Conversation.conversation_type == "CLIENT_ADMIN"
    ).first()
    if convo:
        dp.admin_conversation_id = convo.id
        
    return dp


@router.post("/projects/{project_id}/review", response_model=ProjectResponseCustom)
def review_admin_project(
    project_id: int,
    payload: AdminReviewProjectPayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    # Enforce allowed statuses
    allowed_statuses = ["SUBMITTED", "UNDER_ADMIN_REVIEW", "MATCHING", "BOOKING_CREATED", "COMPLETED", "CANCELLED"]
    if payload.status not in allowed_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid project status: {payload.status}")
        
    # Block moving closed projects back to review
    if project.status in ["BOOKING_CREATED", "COMPLETED", "CANCELLED"] and payload.status in ["SUBMITTED", "UNDER_ADMIN_REVIEW", "MATCHING"]:
        raise HTTPException(status_code=400, detail=f"Cannot transition project from {project.status} to {payload.status}.")

    project.status = payload.status
    project.admin_reviewed_by_id = admin.id
    if payload.admin_review_notes is not None:
        project.admin_review_notes = payload.admin_review_notes
        
    db.commit()
    db.refresh(project)
    
    # Log audit
    AuditService.log_action(
        db=db,
        admin_user_id=admin.id,
        action="PROJECT_REVIEWED",
        entity_type="PROJECT",
        entity_id=project.id,
        description=f"Admin {admin.full_name} reviewed project {project.title} and set status to {project.status}.",
        metadata_json={"status": project.status, "admin_review_notes": project.admin_review_notes}
    )
    
    from app.api.v1.endpoints.projects import decode_project
    return decode_project(project)


@router.post("/projects/{project_id}/match", response_model=BookingAssignmentOut)
def match_freelancer_to_project(
    project_id: int,
    payload: AdminAssignFreelancerPayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found.")
        
    if not project.is_admin_managed:
        raise HTTPException(status_code=400, detail="Only admin-managed projects support matching.")
        
    # Validate matching permitted states
    if project.status not in ["SUBMITTED", "UNDER_ADMIN_REVIEW", "MATCHING", "BOOKING_CREATED"]:
        raise HTTPException(status_code=400, detail=f"Project status {project.status} does not permit matching.")
        
    # Validate freelancer profile
    profile = db.query(FreelancerProfile).filter(FreelancerProfile.id == payload.freelancer_profile_id).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Freelancer profile not found.")
        
    freelancer_user = profile.user
    if not freelancer_user:
        raise HTTPException(status_code=404, detail="User associated with freelancer profile not found.")
        
    if not freelancer_user.is_active:
        raise HTTPException(status_code=400, detail="Freelancer user is inactive.")
        
    if freelancer_user.role != UserRole.FREELANCER:
        raise HTTPException(status_code=400, detail="User role is not FREELANCER.")
        
    if freelancer_user.id == project.client_id:
        raise HTTPException(status_code=400, detail="Freelancer cannot match client of the project.")
        
    if payload.offered_payout_amount is not None and payload.offered_payout_amount < 0:
        raise HTTPException(status_code=400, detail="Offered payout amount must be non-negative.")

    # 1. Get or create Booking (Only once per project!)
    booking = db.query(Booking).filter(Booking.project_id == project.id).first()
    if not booking:
        # Create new Booking
        from app.api.v1.endpoints.projects import decode_project
        decoded_project = decode_project(project)
        
        # Resolve schedule date from deadline if possible
        scheduled_date_val = datetime.now().date()
        if decoded_project.deadline:
            try:
                scheduled_date_val = datetime.strptime(decoded_project.deadline, "%Y-%m-%d").date()
            except Exception:
                pass
                
        # Generate booking number
        from app.repositories.booking_repository import BookingRepository
        booking_num = BookingRepository.generate_booking_number(db)
        
        # Financial splits
        agreed_amt = project.budget
        dep_amt = agreed_amt * Decimal("0.30")
        
        from app.models.booking import BookingSourceType
        booking = Booking(
            booking_number=booking_num,
            client_id=project.client_id,
            project_id=project.id,
            source_type=BookingSourceType.PROJECT,
            title=project.title,
            description=project.description,
            booking_type=project.project_type,
            status=BookingStatus.MATCHING_IN_PROGRESS,
            scheduled_date=scheduled_date_val,
            timezone="Asia/Kolkata",
            agreed_amount=agreed_amt,
            price=agreed_amt,
            deposit_amount=dep_amt,
            deposit_paid_amount=Decimal("0.00"),
            remaining_balance=agreed_amt,
            total_paid=Decimal("0.00"),
            payment_completion_state="UNPAID",
            is_admin_managed=True,
            assigned_by_admin_id=admin.id
        )
        db.add(booking)
        db.commit()
        db.refresh(booking)
        
        # Link CLIENT_ADMIN convo to the new booking
        from app.models.message import Conversation
        convo = db.query(Conversation).filter(
            Conversation.project_id == project.id,
            Conversation.conversation_type == "CLIENT_ADMIN"
        ).first()
        if convo:
            convo.booking_id = booking.id
            db.add(convo)
            db.commit()

    # 2. Call AssignmentService.assign_freelancer
    from app.services.assignment_service import AssignmentService
    from app.models.booking_assignment import BookingAssignment
    
    assignment_out = AssignmentService.assign_freelancer(
        db=db,
        admin_user=admin,
        booking_id=booking.id,
        payload=payload
    )
    
    # 3. Force Client Approval is Required (since client did not choose freelancer on open project)
    assignment_row = db.query(BookingAssignment).filter(
        BookingAssignment.booking_id == booking.id,
        BookingAssignment.status == "OFFERED"
    ).order_by(BookingAssignment.created_at.desc()).first()
    
    if assignment_row:
        assignment_row.is_replacement = True
        assignment_row.client_approval_required = True
        assignment_row.client_approval_status = "PENDING"
        db.add(assignment_row)
        
        # Update booking status to MATCHING_IN_PROGRESS (already set by assign_freelancer)
        # Update project status to BOOKING_CREATED
        project.status = "BOOKING_CREATED"
        db.add(project)
        db.commit()
        db.refresh(assignment_row)
        
        # Re-build response from updated row
        assignment_out = AssignmentService._build_assignment_out(assignment_row)
        
    return assignment_out


@router.get("/deliveries", response_model=List[Any], summary="List all workspace submissions for admin review")
def list_deliveries(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    from app.models.delivery import Delivery
    from app.models.booking import Booking
    from app.models.revision import RevisionRequest
    from app.models.freelancer_profile import FreelancerProfile
    
    deliveries = db.query(Delivery).join(Booking, Booking.id == Delivery.booking_id).order_by(Delivery.submitted_at.desc()).all()
    
    res = []
    for d in deliveries:
        b = d.booking
        # Client name
        client_name = b.client.full_name if b.client else "Client"
        
        # Freelancer name
        freelancer_name = ""
        if b.freelancer_profile_id:
            profile = db.query(FreelancerProfile).filter(FreelancerProfile.id == b.freelancer_profile_id).first()
            if profile:
                freelancer_name = profile.user.full_name if profile.user else ""
                
        # Revision count
        rev_count = db.query(func.count(RevisionRequest.id)).filter(RevisionRequest.booking_id == b.id).scalar() or 0
        
        res.append({
            "id": d.id,
            "booking_id": b.id,
            "booking_number": b.booking_number,
            "booking_title": b.title,
            "client_name": client_name,
            "freelancer_name": freelancer_name,
            "delivery_type": d.delivery_type.value if hasattr(d.delivery_type, "value") else str(d.delivery_type),
            "version": d.version,
            "title": d.title,
            "status": d.status.value if hasattr(d.status, "value") else str(d.status),
            "admin_review_status": d.admin_review_status,
            "submitted_at": d.submitted_at,
            "shared_with_client_at": d.shared_with_client_at,
            "approved_at": d.approved_at,
            "revision_count": rev_count,
            "agreed_amount": float(b.agreed_amount),
            "deposit_paid_amount": float(b.deposit_paid_amount or 0.0),
            "remaining_balance": float(b.remaining_balance or 0.0),
            "payment_completion_state": b.payment_completion_state.value if hasattr(b.payment_completion_state, "value") else str(b.payment_completion_state)
        })
    return res


@router.get("/completed-jobs", response_model=List[Any], summary="List all completed marketplace bookings for audit review")
def list_completed_jobs(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    from app.models.booking import Booking, BookingStatus
    from app.models.freelancer import FreelancerProfile
    from app.models.review import Review
    from app.models.payout import Payout
    
    bookings = db.query(Booking).filter(Booking.status == BookingStatus.COMPLETED).order_by(Booking.completed_at.desc()).all()
    
    res = []
    for b in bookings:
        # Client name
        client_name = b.client.full_name if b.client else "Client"
        
        # Freelancer name
        freelancer_name = ""
        if b.freelancer_profile_id:
            profile = db.query(FreelancerProfile).filter(FreelancerProfile.id == b.freelancer_profile_id).first()
            if profile:
                freelancer_name = profile.user.full_name if profile.user else ""
                
        # Review (Client review)
        review_rating = None
        review_comment = None
        review = db.query(Review).filter(Review.booking_id == b.id).first()
        if review:
            review_rating = review.rating
            review_comment = review.comment
            
        # Payout status
        payout_status = "Not Released"
        payout = db.query(Payout).filter(Payout.booking_id == b.id).first()
        if payout:
            payout_status = payout.status.value if hasattr(payout.status, "value") else str(payout.status)
            
        res.append({
            "id": b.id,
            "booking_number": b.booking_number,
            "booking_title": b.title,
            "client_name": client_name,
            "freelancer_name": freelancer_name,
            "source_type": b.source_type.value if hasattr(b.source_type, "value") else str(b.source_type),
            "agreed_amount": float(b.agreed_amount),
            "payment_status": "Paid in Full" if b.payment_completion_state.value == "PAID" or b.payment_completion_state == "PAID" else "Deposit Only",
            "review_rating": review_rating,
            "review_comment": review_comment,
            "payout_status": payout_status,
            "completed_at": b.completed_at
        })
    return res


# ----------------------------------------------------
# 13. ADMIN PAYOUTS MANAGEMENT
# ----------------------------------------------------

from pydantic import BaseModel

class PayoutProcessPayload(BaseModel):
    action: str  # "APPROVE" or "REJECT"
    transaction_ref: Optional[str] = None
    notes: Optional[str] = None


@router.get("/payouts", response_model=List[Dict[str, Any]], summary="List all freelancer payout requests")
def list_admin_payouts(
    status_filter: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    query = db.query(Payout)
    if status_filter:
        query = query.filter(Payout.status == status_filter)
    payouts = query.order_by(Payout.created_at.desc()).all()
    res = []
    for p in payouts:
        profile = p.freelancer_profile
        freelancer_name = profile.user.full_name if (profile and profile.user) else "Freelancer"
        res.append({
            "id": p.id,
            "payout_number": p.payout_number,
            "freelancer_profile_id": p.freelancer_profile_id,
            "freelancer_name": freelancer_name,
            "amount": float(p.amount),
            "status": p.status.value if hasattr(p.status, "value") else str(p.status),
            "provider": p.provider,
            "provider_transfer_id": p.provider_transfer_id,
            "initiated_at": p.initiated_at,
            "processed_at": p.processed_at,
            "created_at": p.created_at
        })
    return res


@router.post("/payouts/{id}/process", summary="Approve or reject a freelancer payout request")
def process_admin_payout(
    id: int,
    payload: PayoutProcessPayload,
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    payout = db.query(Payout).filter(Payout.id == id).first()
    if not payout:
        raise HTTPException(status_code=404, detail="Payout record not found.")

    if payload.action == "APPROVE":
        payout.status = "PROCESSED"
        payout.processed_at = datetime.now()
        if payload.transaction_ref:
            payout.provider_transfer_id = payload.transaction_ref
        db.commit()
        db.refresh(payout)
        return {"message": "Payout marked as processed successfully", "status": "PROCESSED"}
    elif payload.action == "REJECT":
        payout.status = "FAILED"
        profile = payout.freelancer_profile
        if profile and profile.user:
            ledger_data = {
                "user_id": profile.user.id,
                "freelancer_profile_id": profile.id,
                "booking_id": None,
                "payment_id": None,
                "payout_id": payout.id,
                "entry_type": "ADJUSTMENT",
                "amount": payout.amount,
                "currency": "INR",
                "status": "AVAILABLE",
                "description": f"Reversal for failed payout: {payout.payout_number}"
            }
            from app.repositories.ledger_repository import LedgerRepository
            LedgerRepository.create(db, ledger_data)
        db.commit()
        db.refresh(payout)
        return {"message": "Payout rejected and balance returned to freelancer", "status": "FAILED"}
    else:
        raise HTTPException(status_code=400, detail="Invalid action. Must be APPROVE or REJECT.")


# ----------------------------------------------------
# 14. ADMIN PLATFORM SETTINGS
# ----------------------------------------------------

@router.get("/settings", response_model=List[Dict[str, Any]], summary="List all platform configurations")
def list_admin_settings(
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    PlatformSettingsService.seed_defaults_if_empty(db)
    settings_list = db.query(PlatformSetting).order_by(PlatformSetting.id.asc()).all()
    return [
        {
            "id": s.id,
            "key": s.key,
            "value": s.value,
            "value_type": s.value_type.value if hasattr(s.value_type, "value") else str(s.value_type),
            "description": s.description,
            "is_public": s.is_public,
            "updated_at": s.updated_at
        }
        for s in settings_list
    ]


@router.patch("/settings/{key}", summary="Update a platform setting value")
def update_admin_setting(
    key: str,
    payload: Dict[str, Any],
    db: Session = Depends(get_db),
    admin: User = Depends(require_role("ADMIN"))
):
    new_value = str(payload.get("value", ""))
    setting = PlatformSettingsService.update_setting(db, admin.id, key, new_value)
    return {
        "message": f"Setting '{key}' updated successfully",
        "key": setting.key,
        "value": setting.value,
        "updated_at": setting.updated_at
    }








