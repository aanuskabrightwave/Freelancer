from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from typing import Union

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, VerificationStatus
from app.models.payout_account import FreelancerPayoutAccount
from app.core.security import verify_password, get_password_hash
from app.schemas.settings import (
    ChangePasswordPayload,
    ClientSettingsUpdate,
    FreelancerSettingsUpdate,
    ClientSettingsOut,
    FreelancerSettingsOut
)
from app.services.freelancer_service import FreelancerService

router = APIRouter()

def ensure_settings_columns(db: Session):
    """
    Safely inspects the freelancer_profiles table and executes ALTER TABLE statements
    if any of the work preferences preference columns are missing.
    Supports SQLite (for tests) and MySQL (for development/production).
    """
    try:
        inspector = inspect(db.bind)
        columns = [col["name"] for col in inspector.get_columns("freelancer_profiles")]
        
        # Check and add columns
        if "preferred_categories" not in columns:
            db.execute(text("ALTER TABLE freelancer_profiles ADD COLUMN preferred_categories TEXT NULL"))
        if "preferred_budget_min" not in columns:
            db.execute(text("ALTER TABLE freelancer_profiles ADD COLUMN preferred_budget_min DECIMAL(10, 2) NULL"))
        if "preferred_budget_max" not in columns:
            db.execute(text("ALTER TABLE freelancer_profiles ADD COLUMN preferred_budget_max DECIMAL(10, 2) NULL"))
        if "preferred_work_mode" not in columns:
            db.execute(text("ALTER TABLE freelancer_profiles ADD COLUMN preferred_work_mode VARCHAR(50) NULL"))
        if "preferred_locations" not in columns:
            db.execute(text("ALTER TABLE freelancer_profiles ADD COLUMN preferred_locations VARCHAR(255) NULL"))
        if "open_to_remote" not in columns:
            db.execute(text("ALTER TABLE freelancer_profiles ADD COLUMN open_to_remote BOOLEAN DEFAULT 1 NULL"))
        db.commit()
    except Exception as e:
        db.rollback()
        # Log error or pass silently if it already exists/fails
        pass

@router.get("", response_model=Union[FreelancerSettingsOut, ClientSettingsOut], summary="Get role-specific user settings")
def get_settings(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Ensure database columns exist
    ensure_settings_columns(db)
    
    if current_user.role == UserRole.FREELANCER:
        # Load freelancer profile
        profile = db.query(FreelancerProfile).filter(FreelancerProfile.user_id == current_user.id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Freelancer profile not found")
        
        # Payout status check
        payout = db.query(FreelancerPayoutAccount).filter(FreelancerPayoutAccount.freelancer_profile_id == profile.id).first()
        payout_status = payout.status if payout else "NOT_CONFIGURED"
        
        return FreelancerSettingsOut(
            full_name=current_user.full_name,
            email=current_user.email,
            phone=current_user.phone,
            is_active=current_user.is_active,
            role=current_user.role.value,
            is_profile_public=profile.is_profile_public,
            profile_completion_percentage=profile.profile_completion_percentage,
            verification_status=profile.verification_status.value,
            payout_status=payout_status,
            preferred_categories=profile.preferred_categories,
            preferred_budget_min=profile.preferred_budget_min,
            preferred_budget_max=profile.preferred_budget_max,
            preferred_work_mode=profile.preferred_work_mode,
            preferred_locations=profile.preferred_locations,
            open_to_remote=profile.open_to_remote
        )
    else:
        # Return client-level info
        return ClientSettingsOut(
            full_name=current_user.full_name,
            email=current_user.email,
            phone=current_user.phone,
            is_active=current_user.is_active,
            role=current_user.role.value
        )

@router.patch("", response_model=Union[FreelancerSettingsOut, ClientSettingsOut], summary="Update user settings fields")
def update_settings(
    payload: Union[FreelancerSettingsUpdate, ClientSettingsUpdate],
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    ensure_settings_columns(db)
    
    # Exclude unset fields so we only modify what is provided
    update_data = payload.model_dump(exclude_unset=True)
    
    # 1. Update full_name on User model if provided
    if "full_name" in update_data:
        current_user.full_name = update_data["full_name"]
        db.add(current_user)
        db.commit()
        db.refresh(current_user)
        
    # 2. Update freelancer profile preferences if freelancer
    if current_user.role == UserRole.FREELANCER:
        profile = db.query(FreelancerProfile).filter(FreelancerProfile.user_id == current_user.id).first()
        if not profile:
            raise HTTPException(status_code=404, detail="Freelancer profile not found")
        
        # Publications gate enforcement for is_profile_public
        is_public = update_data.get("is_profile_public")
        if is_public is True:
            completion = FreelancerService.calculate_completion(db, profile)
            if completion < 60:
                raise HTTPException(
                    status_code=400,
                    detail="Profile must be at least 60% complete before publication."
                )
            if len(profile.portfolio) < 1:
                raise HTTPException(
                    status_code=400,
                    detail="Profile must contain at least 1 portfolio item before publication."
                )
        
        # Apply profile fields
        profile_fields = [
            "is_profile_public", "preferred_categories", "preferred_budget_min",
            "preferred_budget_max", "preferred_work_mode", "preferred_locations",
            "open_to_remote"
        ]
        for field in profile_fields:
            if field in update_data:
                setattr(profile, field, update_data[field])
                
        db.add(profile)
        db.commit()
        db.refresh(profile)
        
        payout = db.query(FreelancerPayoutAccount).filter(FreelancerPayoutAccount.freelancer_profile_id == profile.id).first()
        payout_status = payout.status if payout else "NOT_CONFIGURED"
        
        return FreelancerSettingsOut(
            full_name=current_user.full_name,
            email=current_user.email,
            phone=current_user.phone,
            is_active=current_user.is_active,
            role=current_user.role.value,
            is_profile_public=profile.is_profile_public,
            profile_completion_percentage=profile.profile_completion_percentage,
            verification_status=profile.verification_status.value,
            payout_status=payout_status,
            preferred_categories=profile.preferred_categories,
            preferred_budget_min=profile.preferred_budget_min,
            preferred_budget_max=profile.preferred_budget_max,
            preferred_work_mode=profile.preferred_work_mode,
            preferred_locations=profile.preferred_locations,
            open_to_remote=profile.open_to_remote
        )
    else:
        return ClientSettingsOut(
            full_name=current_user.full_name,
            email=current_user.email,
            phone=current_user.phone,
            is_active=current_user.is_active,
            role=current_user.role.value
        )

@router.post("/change-password", summary="Change current authenticated user password securely")
def change_password(
    payload: ChangePasswordPayload,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    # Verify current password is correct
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    
    # Hash and save new password
    current_user.password_hash = get_password_hash(payload.new_password)
    db.add(current_user)
    db.commit()
    return {"message": "Password changed successfully"}

@router.post("/deactivate", summary="Deactivate current account")
def deactivate_account(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    current_user.is_active = False
    db.add(current_user)
    db.commit()
    return {"message": "Account deactivated successfully"}
