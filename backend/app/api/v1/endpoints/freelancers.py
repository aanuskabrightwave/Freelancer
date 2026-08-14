from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile
from app.repositories.freelancer_repository import FreelancerRepository
from app.services.freelancer_service import FreelancerService
from app.services.storage_service import StorageService
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

router = APIRouter()


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
def get_public_freelancer_detail(id: int, db: Session = Depends(get_db)):
    profile = FreelancerRepository.get_profile_by_id(db, id)
    if not profile or not profile.is_profile_public:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Public freelancer profile not found."
        )
    profile.full_name = profile.user.full_name
    profile.trust_badges = [fb.badge.code for fb in profile.badges if fb.is_active]
    return profile
