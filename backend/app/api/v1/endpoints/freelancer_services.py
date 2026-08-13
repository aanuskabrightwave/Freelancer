from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User, UserRole
from app.repositories.freelancer_repository import FreelancerRepository
from app.services.service_service import ServiceService
from app.repositories.service_repository import ServiceRepository
from app.schemas.service import (
    ServiceCreate,
    ServiceUpdate,
    ServiceOut,
    PackageCreate,
    PackageOut,
    ServiceMediaCreate,
    ServiceMediaOut,
    RequirementCreate,
    RequirementOut,
)

router = APIRouter()


def get_freelancer_profile_id(current_user: User, db: Session) -> int:
    """
    Guard that ensures the user is a freelancer and has completed onboarding profile.
    """
    if current_user.role != UserRole.FREELANCER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only freelancers can manage services."
        )
    profile = FreelancerRepository.get_profile_by_user_id(db, current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Freelancer profile not found. Please complete profile onboarding first."
        )
    return profile.id


# 1. Services CRUD
@router.get("/freelancer/services", response_model=List[ServiceOut], summary="List my services")
def get_my_services(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    return ServiceRepository.get_freelancer_services(db, profile_id)


@router.post("/freelancer/services", response_model=ServiceOut, status_code=status.HTTP_201_CREATED, summary="Create service draft")
def create_service(
    service_in: ServiceCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    return ServiceService.create_service(db, profile_id, service_in.model_dump())


@router.get("/freelancer/services/{id}", response_model=ServiceOut, summary="Retrieve my service details")
def get_my_service(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    service = ServiceRepository.get_service_by_id(db, id)
    if not service or service.freelancer_profile_id != profile_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Service not found.")
    return service


@router.patch("/freelancer/services/{id}", response_model=ServiceOut, summary="Update my service details")
def update_service(
    id: int,
    service_in: ServiceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    return ServiceService.update_service(
        db, profile_id, id, service_in.model_dump(exclude_unset=True)
    )


@router.delete("/freelancer/services/{id}", status_code=status.HTTP_204_NO_CONTENT, summary="Archive or delete my service")
def delete_service(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    ServiceService.delete_service_or_archive(db, profile_id, id)
    return None


# 2. Packages CRUD
@router.post("/freelancer/services/{service_id}/packages", response_model=PackageOut, status_code=status.HTTP_201_CREATED, summary="Add a package to service")
def add_package(
    service_id: int,
    package_in: PackageCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    pkg_dict = package_in.model_dump(exclude={"deliverables"})
    deliverables = package_in.deliverables
    deliverables_list = [d.model_dump() for d in deliverables] if deliverables else None
    
    return ServiceService.add_package(
        db, profile_id, service_id, pkg_dict, deliverables_list
    )


@router.patch("/freelancer/services/{service_id}/packages/{package_id}", response_model=PackageOut, summary="Update package details")
def update_package(
    service_id: int,
    package_id: int,
    package_in: PackageCreate,  # Reuse PackageCreate schema for updates
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    pkg_dict = package_in.model_dump(exclude={"deliverables"}, exclude_unset=True)
    deliverables = package_in.deliverables
    deliverables_list = [d.model_dump() for d in deliverables] if deliverables is not None else None

    return ServiceService.update_package(
        db, profile_id, service_id, package_id, pkg_dict, deliverables_list
    )


@router.delete("/freelancer/services/{service_id}/packages/{package_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove a package")
def delete_package(
    service_id: int,
    package_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    ServiceService.delete_package(db, profile_id, service_id, package_id)
    return None


# 3. Media CRUD
@router.post("/freelancer/services/{service_id}/media", response_model=ServiceMediaOut, status_code=status.HTTP_201_CREATED, summary="Add media to service")
def add_media(
    service_id: int,
    media_in: ServiceMediaCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    return ServiceService.add_media(db, profile_id, service_id, media_in.model_dump())


@router.delete("/freelancer/services/{service_id}/media/{media_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove media from service")
def delete_media(
    service_id: int,
    media_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    ServiceService.delete_media(db, profile_id, service_id, media_id)
    return None


@router.patch("/freelancer/services/{service_id}/media/{media_id}/cover", response_model=ServiceMediaOut, summary="Set media as primary cover")
def set_cover_media(
    service_id: int,
    media_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    return ServiceService.toggle_cover_media(db, profile_id, service_id, media_id)


# 4. Requirements CRUD
@router.post("/freelancer/services/{service_id}/requirements", response_model=RequirementOut, status_code=status.HTTP_201_CREATED, summary="Add client requirement question")
def add_requirement(
    service_id: int,
    req_in: RequirementCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    return ServiceService.add_requirement(db, profile_id, service_id, req_in.model_dump())


@router.patch("/freelancer/services/{service_id}/requirements/{requirement_id}", response_model=RequirementOut, summary="Update requirement details")
def update_requirement(
    service_id: int,
    requirement_id: int,
    req_in: RequirementCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    return ServiceService.update_requirement(
        db, profile_id, service_id, requirement_id, req_in.model_dump(exclude_unset=True)
    )


@router.delete("/freelancer/services/{service_id}/requirements/{requirement_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove requirement question")
def delete_requirement(
    service_id: int,
    requirement_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    ServiceService.delete_requirement(db, profile_id, service_id, requirement_id)
    return None


# 5. Publication Controls
@router.post("/freelancer/services/{id}/publish", response_model=ServiceOut, summary="Validate and publish a service listing")
def publish_service(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    return ServiceService.publish_service(db, profile_id, id)


@router.post("/freelancer/services/{id}/pause", response_model=ServiceOut, summary="Pause a published service listing")
def pause_service(
    id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    profile_id = get_freelancer_profile_id(current_user, db)
    return ServiceService.pause_service(db, profile_id, id)
