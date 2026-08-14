from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.dependencies.auth import get_current_active_user
from app.models.user import User, UserRole
from app.services.favourite_service import FavouriteServiceHelper
from app.schemas.favourite import FavouriteFreelancerOut, FavouriteServiceOut

router = APIRouter()


# 1. Favourite Freelancers
@router.post("/client/favourites/freelancers/{freelancer_id}", response_model=FavouriteFreelancerOut, status_code=status.HTTP_201_CREATED, summary="Add a freelancer to client's favorites list")
def add_freelancer_to_favourites(
    freelancer_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only client accounts can favorite creative professionals.")
    return FavouriteServiceHelper.add_favourite_freelancer(db, current_user.id, freelancer_id)


@router.delete("/client/favourites/freelancers/{freelancer_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove a freelancer from client's favorites list")
def remove_freelancer_from_favourites(
    freelancer_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only client accounts can manage favorites.")
    FavouriteServiceHelper.remove_favourite_freelancer(db, current_user.id, freelancer_id)
    return None


@router.get("/client/favourites/freelancers", response_model=List[FavouriteFreelancerOut], summary="List client's favorite creative professionals")
def list_my_favourite_freelancers(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only client accounts can manage favorites.")
    return FavouriteServiceHelper.get_favourite_freelancers(db, current_user.id)


# 2. Favourite Services
@router.post("/client/favourites/services/{service_id}", response_model=FavouriteServiceOut, status_code=status.HTTP_201_CREATED, summary="Add a service to client's saved services list")
def add_service_to_favourites(
    service_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only client accounts can save services.")
    return FavouriteServiceHelper.add_favourite_service(db, current_user.id, service_id)


@router.delete("/client/favourites/services/{service_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Remove a service from client's saved services list")
def remove_service_from_favourites(
    service_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only client accounts can manage saved services.")
    FavouriteServiceHelper.remove_favourite_service(db, current_user.id, service_id)
    return None


@router.get("/client/favourites/services", response_model=List[FavouriteServiceOut], summary="List client's saved marketplace services")
def list_my_favourite_services(
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    if current_user.role != UserRole.CLIENT:
        raise HTTPException(status_code=403, detail="Only client accounts can manage saved services.")
    return FavouriteServiceHelper.get_favourite_services(db, current_user.id)
