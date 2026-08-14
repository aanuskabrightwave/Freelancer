from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.repositories.service_repository import ServiceRepository
from app.models.service import ServiceStatus
from app.schemas.service import PublicServiceOut, ServiceCategoryOut

router = APIRouter()


@router.get("/services", response_model=List[PublicServiceOut], summary="List published marketplace services")
def list_public_services(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = Query(None),
    subcategory_id: Optional[int] = Query(None),
    service_type: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    db: Session = Depends(get_db)
):
    services = ServiceRepository.get_all_public_services(
        db=db,
        page=page,
        page_size=page_size,
        category_id=category_id,
        subcategory_id=subcategory_id,
        service_type=service_type,
        city=city,
        min_price=min_price,
        max_price=max_price
    )
    
    # Map to schema output formatting to attach freelancer profile details
    results = []
    for s in services:
        prof = s.freelancer_profile
        fl_user = prof.user if prof else None
        
        fl_summary = None
        if prof and fl_user:
            fl_summary = {
                "id": prof.id,
                "full_name": fl_user.full_name,
                "professional_title": prof.professional_title or "",
                "profile_photo_url": prof.profile_photo_url
            }
            
        # Convert model attributes to schema
        results.append({
            "id": s.id,
            "title": s.title,
            "slug": s.slug,
            "short_description": s.short_description,
            "description": s.description,
            "service_type": s.service_type,
            "starting_price": s.starting_price,
            "city": s.city,
            "state": s.state,
            "country": s.country,
            "service_radius_km": s.service_radius_km,
            "travel_available": s.travel_available,
            "travel_fee": s.travel_fee,
            "average_rating": s.average_rating,
            "review_count": s.review_count,
            "freelancer": fl_summary,
            "packages": s.packages,
            "media": s.media,
            "requirements": s.requirements,
            "category": s.category,
            "subcategory": s.subcategory,
        })
        
    return results


@router.get("/services/categories", response_model=List[ServiceCategoryOut], summary="List hierarchical categories")
def get_service_categories(db: Session = Depends(get_db)):
    return ServiceRepository.get_all_categories(db)


@router.get("/services/{id}", response_model=PublicServiceOut, summary="Retrieve published service details")
def get_public_service(
    id: int,
    db: Session = Depends(get_db)
):
    s = ServiceRepository.get_service_by_id(db, id)
    if not s or s.status != ServiceStatus.PUBLISHED:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found or is currently unavailable."
        )
        
    prof = s.freelancer_profile
    fl_user = prof.user if prof else None
    
    fl_summary = None
    if prof and fl_user:
        fl_summary = {
            "id": prof.id,
            "full_name": fl_user.full_name,
            "professional_title": prof.professional_title or "",
            "profile_photo_url": prof.profile_photo_url
        }

    return {
        "id": s.id,
        "title": s.title,
        "slug": s.slug,
        "short_description": s.short_description,
        "description": s.description,
        "service_type": s.service_type,
        "starting_price": s.starting_price,
        "city": s.city,
        "state": s.state,
        "country": s.country,
        "service_radius_km": s.service_radius_km,
        "travel_available": s.travel_available,
        "travel_fee": s.travel_fee,
        "average_rating": s.average_rating,
        "review_count": s.review_count,
        "freelancer": fl_summary,
        "packages": s.packages,
        "media": s.media,
        "requirements": s.requirements,
        "category": s.category,
        "subcategory": s.subcategory,
    }
