from typing import List, Optional
from fastapi import APIRouter, Depends, status, HTTPException, Query
from sqlalchemy.orm import Session
from datetime import date, time, datetime

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User
from app.repositories.freelancer_repository import FreelancerRepository
from app.services.availability_service import AvailabilityService
from app.schemas.availability import (
    WeeklyScheduleUpdate,
    WeeklyScheduleResponse,
    AvailabilityOverrideCreate,
    AvailabilityOverrideResponse,
    PublicAvailabilityCheckResponse
)

router = APIRouter()


@router.get("/freelancer/availability", response_model=dict, summary="Get freelancer schedule and override configurations")
def get_freelancer_schedule_details(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = FreelancerRepository.get_profile_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Freelancer profile not found")
        
    schedules = AvailabilityService.get_weekly_schedule(db, profile.id)
    overrides = AvailabilityService.get_overrides(db, profile.id)
    return {
        "weekly_schedule": [WeeklyScheduleResponse.model_validate(s) for s in schedules],
        "overrides": [AvailabilityOverrideResponse.model_validate(o) for o in overrides]
    }


@router.put("/freelancer/availability/weekly", response_model=List[WeeklyScheduleResponse], summary="Update weekly working schedule hours")
def update_weekly_availability(
    schedule_in: WeeklyScheduleUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = FreelancerRepository.get_profile_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Freelancer profile not found")
        
    updated = AvailabilityService.update_weekly_schedule(db, profile.id, [s.model_dump() for s in schedule_in.schedules])
    return updated


@router.post("/freelancer/availability/override", response_model=AvailabilityOverrideResponse, status_code=status.HTTP_201_CREATED, summary="Create date override blockout")
def create_date_override(
    override_in: AvailabilityOverrideCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = FreelancerRepository.get_profile_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Freelancer profile not found")
        
    return AvailabilityService.create_override(db, profile.id, override_in.model_dump())


@router.delete("/freelancer/availability/override/{id}", response_model=dict, summary="Remove date override")
def delete_date_override(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile = FreelancerRepository.get_profile_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(status_code=404, detail="Freelancer profile not found")
        
    AvailabilityService.delete_override(db, id, profile.id)
    return {"status": "success", "message": "Override deleted successfully"}


@router.get("/freelancers/{freelancer_id}/availability", response_model=PublicAvailabilityCheckResponse, summary="Public availability checker")
def check_public_availability(
    freelancer_id: int,
    date_val: date = Query(..., alias="date"),
    start_time_str: Optional[str] = Query(None, alias="start_time"),
    end_time_str: Optional[str] = Query(None, alias="end_time"),
    db: Session = Depends(get_db)
):
    # Retrieve profile
    profile = FreelancerRepository.get_profile_by_id(db, freelancer_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Freelancer profile not found")

    # Time parsing fallbacks
    start_t = time(9, 0)
    if start_time_str:
        start_t = datetime.strptime(start_time_str, "%H:%M").time()
        
    end_t = time(18, 0)
    if end_time_str:
        end_t = datetime.strptime(end_time_str, "%H:%M").time()

    check = AvailabilityService.check_availability(db, profile.id, date_val, start_t, end_t)
    return {
        "date": date_val,
        "available": check["available"]
    }
