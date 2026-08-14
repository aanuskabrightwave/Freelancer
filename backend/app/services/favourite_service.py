from typing import List
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.favourite import FavouriteFreelancer, FavouriteService
from app.models.freelancer_profile import FreelancerProfile
from app.models.service import Service
from app.models.user import User


class FavouriteServiceHelper:
    @staticmethod
    def add_favourite_freelancer(db: Session, client_id: int, freelancer_profile_id: int) -> FavouriteFreelancer:
        # Verify freelancer profile exists
        freelancer = db.query(FreelancerProfile).filter(FreelancerProfile.id == freelancer_profile_id).first()
        if not freelancer:
            raise HTTPException(status_code=404, detail="Freelancer profile not found")

        # Prevent favoriting oneself
        if freelancer.user_id == client_id:
            raise HTTPException(status_code=400, detail="You cannot favorite your own profile")

        # Check if already favorited
        fav = db.query(FavouriteFreelancer).filter(
            FavouriteFreelancer.client_id == client_id,
            FavouriteFreelancer.freelancer_profile_id == freelancer_profile_id
        ).first()

        if fav:
            return fav

        new_fav = FavouriteFreelancer(client_id=client_id, freelancer_profile_id=freelancer_profile_id)
        db.add(new_fav)
        db.commit()
        db.refresh(new_fav)
        return new_fav

    @staticmethod
    def remove_favourite_freelancer(db: Session, client_id: int, freelancer_profile_id: int) -> None:
        fav = db.query(FavouriteFreelancer).filter(
            FavouriteFreelancer.client_id == client_id,
            FavouriteFreelancer.freelancer_profile_id == freelancer_profile_id
        ).first()
        if not fav:
            raise HTTPException(status_code=404, detail="Favourite not found")
        db.delete(fav)
        db.commit()

    @staticmethod
    def get_favourite_freelancers(db: Session, client_id: int) -> List[FavouriteFreelancer]:
        favs = db.query(FavouriteFreelancer).filter(FavouriteFreelancer.client_id == client_id).all()
        results = []
        for fav in favs:
            prof = fav.freelancer
            user = prof.user if prof else None
            if prof and user:
                # Award badges dynamic query
                badges = [fb.badge.name for fb in prof.badges if fb.is_active]
                
                # Attach extra properties for schema output mapping
                fav.full_name = user.full_name
                fav.professional_title = prof.professional_title
                fav.city = prof.city
                fav.state = prof.state
                fav.country = prof.country
                fav.starting_price = prof.starting_price
                fav.profile_photo_url = prof.profile_photo_url
                fav.average_rating = prof.average_rating
                fav.review_count = prof.review_count
                fav.trust_badges = badges
                results.append(fav)
        return results

    @staticmethod
    def add_favourite_service(db: Session, client_id: int, service_id: int) -> FavouriteService:
        # Verify service exists
        service = db.query(Service).filter(Service.id == service_id).first()
        if not service:
            raise HTTPException(status_code=404, detail="Service not found")

        # Prevent favoriting own service
        if service.freelancer_profile.user_id == client_id:
            raise HTTPException(status_code=400, detail="You cannot favorite your own service")

        # Check if already favorited
        fav = db.query(FavouriteService).filter(
            FavouriteService.client_id == client_id,
            FavouriteService.service_id == service_id
        ).first()

        if fav:
            return fav

        new_fav = FavouriteService(client_id=client_id, service_id=service_id)
        db.add(new_fav)
        db.commit()
        db.refresh(new_fav)
        return new_fav

    @staticmethod
    def remove_favourite_service(db: Session, client_id: int, service_id: int) -> None:
        fav = db.query(FavouriteService).filter(
            FavouriteService.client_id == client_id,
            FavouriteService.service_id == service_id
        ).first()
        if not fav:
            raise HTTPException(status_code=404, detail="Favourite not found")
        db.delete(fav)
        db.commit()

    @staticmethod
    def get_favourite_services(db: Session, client_id: int) -> List[FavouriteService]:
        favs = db.query(FavouriteService).filter(FavouriteService.client_id == client_id).all()
        results = []
        for fav in favs:
            s = fav.service
            if s:
                # Find cover image
                cover = next((m.media_url for m in s.media if m.is_cover), None)
                if not cover and s.media:
                    cover = s.media[0].media_url

                prof = s.freelancer_profile
                user = prof.user if prof else None

                fav.title = s.title
                fav.freelancer_name = user.full_name if user else "Creative Professional"
                fav.starting_price = s.starting_price
                fav.service_type = s.service_type
                fav.cover_image_url = cover
                fav.average_rating = s.average_rating
                fav.review_count = s.review_count
                results.append(fav)
        return results
