from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User, UserRole
from app.repositories.freelancer_repository import FreelancerRepository
from app.services.review_service import ReviewService
from app.schemas.review import (
    ReviewCreate,
    ReviewUpdate,
    ReviewOut,
    ReviewResponseCreate,
    ReviewResponseOut,
    ReviewReportCreate,
    ReviewReportOut
)

router = APIRouter()


# 1. CLIENT Reviews CRUD
@router.post("/client/bookings/{booking_id}/review", response_model=ReviewOut, status_code=status.HTTP_201_CREATED, summary="Submit a review for a completed booking")
def create_booking_review(
    booking_id: int,
    payload: ReviewCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only client users can submit booking reviews.")
    return ReviewService.create_review(db, current_user.id, booking_id, payload.model_dump())


@router.get("/client/reviews", response_model=List[ReviewOut], summary="List all reviews submitted by client")
def list_my_submitted_reviews(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only client users can list their submitted reviews.")
    return ReviewService.get_client_reviews(db, current_user.id)


@router.patch("/client/reviews/{id}", response_model=ReviewOut, summary="Edit client's own review")
def edit_submitted_review(
    id: int,
    payload: ReviewUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only client users can edit reviews.")
    return ReviewService.edit_review(db, current_user.id, id, payload.model_dump(exclude_unset=True))


@router.delete("/client/reviews/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Soft delete/remove client's own review")
def delete_submitted_review(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only client users can request review removal.")
    ReviewService.soft_delete_review(db, current_user.id, id)
    return None


# 2. FREELANCER Review Dashboard & Reply
@router.get("/freelancer/reviews", response_model=List[ReviewOut], summary="List reviews received by the authenticated freelancer")
def list_my_received_reviews(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(status_code=403, detail="Only freelancer users can access the reviews dashboard.")
    
    profile = FreelancerRepository.get_profile_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Freelancer profile not found.")
        
    return ReviewService.get_freelancer_reviews(db, profile.id)


@router.post("/freelancer/reviews/{review_id}/response", response_model=ReviewResponseOut, status_code=status.HTTP_201_CREATED, summary="Post a response to a review")
def create_review_response(
    review_id: int,
    payload: ReviewResponseCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(status_code=403, detail="Only freelancers can reply to reviews.")
    
    profile = FreelancerRepository.get_profile_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Freelancer profile not found.")

    return ReviewService.create_response(db, profile.id, review_id, payload.response)


@router.patch("/freelancer/reviews/{review_id}/response", response_model=ReviewResponseOut, summary="Edit freelancer's response to a review")
def edit_review_response(
    review_id: int,
    payload: ReviewResponseCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(status_code=403, detail="Only freelancers can reply to reviews.")
    
    profile = FreelancerRepository.get_profile_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Freelancer profile not found.")

    return ReviewService.edit_response(db, profile.id, review_id, payload.response)


# 3. PUBLIC Review queries
@router.get("/freelancers/{id}/reviews", response_model=List[ReviewOut], summary="List published reviews for a freelancer profile")
def list_public_freelancer_reviews(
    id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    rating: Optional[int] = Query(None, ge=1, le=5),
    sort: Optional[str] = Query(None, description="newest, oldest, highest, lowest"),
    db: Session = Depends(get_db)
):
    return ReviewService.list_public_freelancer_reviews(db, id, page, page_size, rating, sort)


@router.get("/services/{id}/reviews", response_model=List[ReviewOut], summary="List published reviews for a specific marketplace service")
def list_public_service_reviews(
    id: int,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    return ReviewService.list_service_reviews(db, id, page, page_size)


# 4. REPORT Review Content
@router.post("/reviews/{review_id}/report", response_model=ReviewReportOut, status_code=status.HTTP_201_CREATED, summary="Report inappropriate review content")
def report_inappropriate_review(
    review_id: int,
    payload: ReviewReportCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    return ReviewService.create_report(db, current_user.id, review_id, payload.model_dump())
