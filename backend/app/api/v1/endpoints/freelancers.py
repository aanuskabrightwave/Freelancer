from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session
import os
from pydantic import BaseModel, Field
from fastapi.responses import FileResponse

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user, get_current_user_optional
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, VerificationStatus
from app.models.verification import FreelancerVerification, VerificationDocument, DocumentType, DocumentStatus
from app.repositories.freelancer_repository import FreelancerRepository
from app.services.freelancer_service import FreelancerService
from app.services.storage_service import StorageService
from app.services.verification_service import VerificationService
from app.core.config import settings
from app.schemas.freelancer import (
    FreelancerProfileCreate,
    FreelancerProfileUpdate,
    FreelancerProfileOut,
    PublicFreelancerProfileOut,
    SkillOut,
    SkillAssociateRequest,
    EquipmentCreate,
    EquipmentOut,
    PortfolioCreate,
    PortfolioOut,
)
from app.schemas.project import FreelancerProposalOut

router = APIRouter()

# Schema for Freelancer Verification submissions
class DocumentSubmitCustom(BaseModel):
    document_type: DocumentType
    file_path: str
    mime_type: str

class VerificationSubmitCustom(BaseModel):
    documents: List[DocumentSubmitCustom] = Field(..., min_length=1)


# 1. Profile CRUD Endpoints
@router.get("/freelancer/profile", response_model=FreelancerProfileOut, summary="Get active freelancer's profile details")
def get_my_profile(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = FreelancerService.get_my_profile(db, current_user)
    profile.full_name = current_user.full_name
    profile.trust_badges = [fb.badge.code for fb in profile.badges if fb.is_active]
    return profile


@router.post("/freelancer/profile", response_model=FreelancerProfileOut, status_code=status.HTTP_201_CREATED, summary="Create a new professional freelancer profile")
def create_profile(
    profile_in: FreelancerProfileCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = FreelancerService.create_freelancer_profile(db, current_user, profile_in.model_dump())
    profile.full_name = current_user.full_name
    profile.trust_badges = [fb.badge.code for fb in profile.badges if fb.is_active]
    return profile


@router.patch("/freelancer/profile", response_model=FreelancerProfileOut, summary="Partially update current freelancer profile details")
def update_profile(
    profile_in: FreelancerProfileUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = FreelancerService.update_my_profile(
        db, current_user, profile_in.model_dump(exclude_unset=True)
    )
    profile.full_name = current_user.full_name
    profile.trust_badges = [fb.badge.code for fb in profile.badges if fb.is_active]
    return profile


@router.post("/freelancer/profile/skills", response_model=FreelancerProfileOut, summary="Associate skills to the freelancer profile")
def associate_skills(
    request: SkillAssociateRequest,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = FreelancerService.set_skills(db, current_user, request.skill_ids)
    profile.full_name = current_user.full_name
    profile.trust_badges = [fb.badge.code for fb in profile.badges if fb.is_active]
    return profile


# 2. File Upload Utility
@router.post("/freelancer/profile/upload", summary="Securely upload profile/cover images or portfolio files")
def upload_file(
    file: UploadFile = File(...),
    subfolder: str = Query("profiles", description="Target upload subfolder (profiles, portfolios)"),
    current_user: User = Depends(get_current_active_user)
):
    """
    Utility endpoint allowing files <= 5MB for images or <= 50MB for videos.
    Rejects unauthorized access.
    """
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only freelancers may upload files."
        )

    file_url = StorageService.save_file(file, subfolder)
    return {"file_url": file_url}


# 3. Equipment CRUD
@router.get("/freelancer/profile/equipment", response_model=List[EquipmentOut], summary="List freelancer's equipment items")
def get_my_equipment(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = FreelancerService.get_my_profile(db, current_user)
    return profile.equipment


@router.post("/freelancer/profile/equipment", response_model=EquipmentOut, status_code=status.HTTP_201_CREATED, summary="Add an equipment item")
def add_equipment(
    eq_in: EquipmentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return FreelancerService.create_equipment(db, current_user, eq_in.model_dump())


@router.put("/freelancer/profile/equipment/{id}", response_model=EquipmentOut, summary="Update an equipment item details")
def update_equipment(
    id: int,
    eq_in: EquipmentCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return FreelancerService.update_equipment(db, current_user, id, eq_in.model_dump())


@router.delete("/freelancer/profile/equipment/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove an equipment item")
def delete_equipment(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    FreelancerService.delete_equipment(db, current_user, id)
    return None


# 4. Portfolio CRUD
@router.get("/freelancer/profile/portfolio", response_model=List[PortfolioOut], summary="List freelancer's portfolio work items")
def get_my_portfolio(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = FreelancerService.get_my_profile(db, current_user)
    return profile.portfolio


@router.post("/freelancer/profile/portfolio", response_model=PortfolioOut, status_code=status.HTTP_201_CREATED, summary="Add a portfolio item")
def add_portfolio_item(
    item_in: PortfolioCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return FreelancerService.create_portfolio_item(db, current_user, item_in.model_dump())


@router.put("/freelancer/profile/portfolio/{id}", response_model=PortfolioOut, summary="Update portfolio item details")
def update_portfolio_item(
    id: int,
    item_in: PortfolioCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return FreelancerService.update_portfolio_item(db, current_user, id, item_in.model_dump())


@router.patch("/freelancer/profile/portfolio/{id}/featured", response_model=PortfolioOut, summary="Toggle portfolio item featured status (max 6)")
def toggle_featured_item(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return FreelancerService.toggle_featured_portfolio_item(db, current_user, id)


@router.delete("/freelancer/profile/portfolio/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove a portfolio item")
def delete_portfolio_item(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    FreelancerService.delete_portfolio_item(db, current_user, id)
    return None


# 5. Global / Auxiliary Endpoints
@router.get("/skills", response_model=List[SkillOut], summary="Retrieve list of all active database skills, seeds if empty")
def list_skills(db: Session = Depends(get_db)):
    return FreelancerService.seed_skills_if_empty(db)


# 6. Public Client / Visitor Endpoints
@router.get("/freelancers", response_model=List[PublicFreelancerProfileOut], summary="Query all public, published freelancer profiles")
def list_public_freelancers(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    profession: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    sort: Optional[str] = Query(None, description="rating_desc, completion_desc"),
    db: Session = Depends(get_db)
):
    # Retrieve profiles matching filters
    query = db.query(FreelancerProfile).filter(FreelancerProfile.is_profile_public == True)
    
    if profession:
        query = query.filter(FreelancerProfile.primary_profession == profession.upper())
    if city:
        query = query.filter(FreelancerProfile.city.like(f"%{city.strip()}%"))

    # Sorting options
    if sort == "rating_desc":
        # Sort by average_rating, fallback to review volume, then completion
        query = query.order_by(
            FreelancerProfile.average_rating.desc(),
            FreelancerProfile.review_count.desc(),
            FreelancerProfile.profile_completion_percentage.desc()
        )
    else:
        query = query.order_by(FreelancerProfile.profile_completion_percentage.desc())

    offset = (page - 1) * page_size
    profiles = query.offset(offset).limit(page_size).all()

    for p in profiles:
        p.full_name = p.user.full_name
        p.trust_badges = [fb.badge.code for fb in p.badges if fb.is_active]
    return profiles


@router.get("/freelancers/{id}", response_model=PublicFreelancerProfileOut, summary="Get public details of a published freelancer profile")
def get_public_freelancer_detail(
    id: int, 
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: Session = Depends(get_db)
):
    profile = FreelancerRepository.get_profile_by_id(db, id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Public freelancer profile not found."
        )
    
    # Allow viewing if the profile is public OR the current user is the owner
    is_owner = current_user and current_user.id == profile.user_id
    if not profile.is_profile_public and not is_owner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Public freelancer profile not found."
        )
        
    profile.full_name = profile.user.full_name
    profile.trust_badges = [fb.badge.code for fb in profile.badges if fb.is_active]
    return profile


@router.get(
    "/freelancer/proposals",
    response_model=List[FreelancerProposalOut],
    summary="Get current freelancer's own proposals"
)
def get_my_proposals(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    from app.models.project import Proposal
    from app.models.booking import Booking

    if current_user.role != "FREELANCER":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only freelancer accounts can retrieve freelancer proposals"
        )
    
    # Get freelancer profile
    profile = db.query(FreelancerProfile).filter(FreelancerProfile.user_id == current_user.id).first()
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Freelancer profile not found"
        )
        
    proposals = db.query(Proposal).filter(Proposal.freelancer_profile_id == profile.id).all()
    
    proposal_ids = [p.id for p in proposals]
    bookings_map = {}
    if proposal_ids:
        bookings = db.query(Booking).filter(Booking.proposal_id.in_(proposal_ids)).all()
        bookings_map = {b.proposal_id: b for b in bookings}
        
    result = []
    for p in proposals:
        booking_obj = bookings_map.get(p.id)
        result.append({
            "id": p.id,
            "project_id": p.project_id,
            "freelancer_profile_id": p.freelancer_profile_id,
            "proposed_amount": p.proposed_amount,
            "cover_letter": p.cover_letter,
            "status": p.status,
            "created_at": p.created_at,
            "updated_at": p.updated_at,
            "project": p.project,
            "booking": booking_obj
        })
        
    return result

# 6. FREELANCER VERIFICATION ENDPOINTS
@router.get("/freelancer/verification", summary="Get freelancer's verification status")
def get_freelancer_verification_status(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only freelancer profiles can access verification details."
        )

    profile = FreelancerService.get_my_profile(db, current_user)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Freelancer profile not configured."
        )

    verification = VerificationService.get_verification_by_freelancer_id(db, profile.id)
    if not verification:
        return {
            "status": VerificationStatus.NOT_SUBMITTED.value,
            "documents": []
        }

    return {
        "id": verification.id,
        "status": verification.status.value,
        "submitted_at": verification.submitted_at,
        "rejection_reason": verification.rejection_reason,
        "admin_notes": verification.admin_notes,
        "documents": [{
            "id": d.id,
            "document_type": d.document_type.value,
            "mime_type": d.mime_type,
            "status": d.status.value
        } for d in verification.documents]
    }

@router.post("/freelancer/verification", status_code=status.HTTP_201_CREATED, summary="Submit freelancer verification request")
def submit_freelancer_verification(
    payload: VerificationSubmitCustom,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only freelancers can submit verification documents."
        )

    profile = FreelancerService.get_my_profile(db, current_user)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Freelancer profile setup required before submitting verification."
        )

    # Validate document file paths and existences
    sanitized_docs = []
    for doc in payload.documents:
        # Validate storage path safety to prevent IDOR access of other files
        clean_path = doc.file_path.strip()
        if not clean_path.startswith("/uploads/verifications/"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Verification files must be located inside the secure verifications storage."
            )

        # Validate existence on disk
        local_rel = clean_path.replace("/uploads/", "")
        local_path = os.path.normpath(os.path.join(settings.UPLOAD_STORAGE_PATH, local_rel))
        
        # Verify directory traversal block
        uploads_base = os.path.normpath(settings.UPLOAD_STORAGE_PATH)
        if not local_path.startswith(uploads_base) or not os.path.exists(local_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more specified verification files were not found on disk."
            )

        sanitized_docs.append({
            "document_type": doc.document_type,
            "file_path": clean_path,
            "mime_type": doc.mime_type
        })

    # Delegate to VerificationService (already validates active review requests)
    return VerificationService.submit_verification(db, profile.id, sanitized_docs)

@router.get("/freelancer/verification/documents/{doc_id}/download", summary="Securely download freelancer's own verification document")
def download_my_verification_document(
    doc_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only freelancers can retrieve document files."
        )

    profile = FreelancerService.get_my_profile(db, current_user)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Freelancer profile not found."
        )

    doc = db.query(VerificationDocument).filter(VerificationDocument.id == doc_id).first()
    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Verification document not found."
        )

    # Enforce Owner Authorization check
    if doc.verification.freelancer_profile_id != profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have permission to access this document."
        )

    local_rel = doc.file_path.replace("/uploads/", "")
    local_path = os.path.normpath(os.path.join(settings.UPLOAD_STORAGE_PATH, local_rel))

    if not os.path.exists(local_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on local disk."
        )

    return FileResponse(local_path, media_type=doc.mime_type)
