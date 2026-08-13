from typing import List, Optional
from fastapi import HTTPException, status
from sqlalchemy.orm import Session
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession, VerificationStatus
from app.models.skill import Skill
from app.models.equipment import FreelancerEquipment, EquipmentType
from app.models.portfolio import PortfolioItem, MediaType
from app.models.user import User
from app.repositories.freelancer_repository import FreelancerRepository


class FreelancerService:
    @staticmethod
    def calculate_completion(db: Session, profile: FreelancerProfile) -> int:
        """
        Dynamically calculate and save the freelancer profile completion percentage.
        Weighting:
          - Basic Information (title, bio): 20%
          - Professional Details (primary profession, experience): 15%
          - Location (city, state, country): 10%
          - Skills (at least 3 skills): 10%
          - Equipment (at least 1 equipment): 10%
          - Portfolio (at least 3 items): 20%
          - Pricing (at least 1 price field): 10%
          - Profile Photo: 5%
        """
        percentage = 0

        # 1. Basic Information (20%)
        if (profile.professional_title and profile.professional_title.strip() and 
                profile.bio and len(profile.bio.strip()) >= 30):
            percentage += 20

        # 2. Professional Details (15%)
        if profile.primary_profession and profile.experience_years is not None:
            percentage += 15

        # 3. Location (10%)
        if (profile.city and profile.city.strip() and 
                profile.state and profile.state.strip() and 
                profile.country and profile.country.strip()):
            percentage += 10

        # 4. Skills (10%)
        if len(profile.skills) >= 3:
            percentage += 10

        # 5. Equipment (10%)
        if len(profile.equipment) >= 1:
            percentage += 10

        # 6. Portfolio (20%)
        if len(profile.portfolio) >= 3:
            percentage += 20

        # 7. Pricing (10%)
        if (profile.starting_price is not None or 
                profile.hourly_rate is not None or 
                profile.event_rate is not None):
            percentage += 10

        # 8. Profile Photo (5%)
        if profile.profile_photo_url and profile.profile_photo_url.strip():
            percentage += 5

        # Update in database if it changed
        if profile.profile_completion_percentage != percentage:
            FreelancerRepository.update_profile(db, profile, {"profile_completion_percentage": percentage})

        return percentage

    @staticmethod
    def create_freelancer_profile(dbSession: Session, user: User, profile_data: dict) -> FreelancerProfile:
        """
        Create a new freelancer profile for the logged in user.
        Raises 403 if user role is not FREELANCER.
        Raises 409 if profile already exists.
        """
        if user.role != "FREELANCER":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only users with role = FREELANCER can create a professional profile."
            )

        existing = FreelancerRepository.get_profile_by_user_id(dbSession, user.id)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A professional profile already exists for this account."
            )

        profile_data["user_id"] = user.id
        profile = FreelancerRepository.create_profile(dbSession, profile_data)
        
        # Calculate completion percentage initially
        FreelancerService.calculate_completion(dbSession, profile)
        return profile

    @staticmethod
    def get_my_profile(dbSession: Session, user: User) -> FreelancerProfile:
        """
        Get the current user's profile. Raises 404 if it does not exist.
        """
        profile = FreelancerRepository.get_profile_by_user_id(dbSession, user.id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Freelancer profile not found. Please complete onboarding first."
            )
        # Recalculate percentage to sync
        FreelancerService.calculate_completion(dbSession, profile)
        return profile

    @staticmethod
    def update_my_profile(dbSession: Session, user: User, update_data: dict) -> FreelancerProfile:
        """
        Update the current user's profile.
        Handles the publication gate rule.
        """
        profile = FreelancerRepository.get_profile_by_user_id(dbSession, user.id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Freelancer profile not found."
            )

        # Enforce publication gate if they try to set is_profile_public = True
        is_public = update_data.get("is_profile_public")
        if is_public is True:
            # Re-verify completion percentage
            completion = FreelancerService.calculate_completion(dbSession, profile)
            if completion < 60:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Profile must be at least 60% complete before publication."
                )
            if len(profile.portfolio) < 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Profile must contain at least 1 portfolio item before publication."
                )

        updated_profile = FreelancerRepository.update_profile(dbSession, profile, update_data)
        FreelancerService.calculate_completion(dbSession, updated_profile)
        return updated_profile

    # Skills Association
    @staticmethod
    def set_skills(dbSession: Session, user: User, skill_ids: List[int]) -> FreelancerProfile:
        """
        Update the freelancer's associated skills.
        """
        profile = FreelancerRepository.get_profile_by_user_id(dbSession, user.id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Freelancer profile not found."
            )

        skills = FreelancerRepository.get_skills_by_ids(dbSession, skill_ids)
        profile.skills = skills
        dbSession.commit()
        dbSession.refresh(profile)

        # Recalculate completion
        FreelancerService.calculate_completion(dbSession, profile)
        return profile

    # Equipment Management
    @staticmethod
    def create_equipment(dbSession: Session, user: User, eq_data: dict) -> FreelancerEquipment:
        profile = FreelancerRepository.get_profile_by_user_id(dbSession, user.id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Freelancer profile not found."
            )

        eq_data["freelancer_profile_id"] = profile.id
        eq = FreelancerRepository.create_equipment(dbSession, eq_data)
        
        # Update completion
        FreelancerService.calculate_completion(dbSession, profile)
        return eq

    @staticmethod
    def update_equipment(dbSession: Session, user: User, eq_id: int, update_data: dict) -> FreelancerEquipment:
        profile = FreelancerRepository.get_profile_by_user_id(dbSession, user.id)
        eq = FreelancerRepository.get_equipment_by_id(dbSession, eq_id)
        if not eq:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Equipment not found."
            )
        if not profile or eq.freelancer_profile_id != profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this equipment."
            )

        updated_eq = FreelancerRepository.update_equipment(dbSession, eq, update_data)
        FreelancerService.calculate_completion(dbSession, profile)
        return updated_eq

    @staticmethod
    def delete_equipment(dbSession: Session, user: User, eq_id: int) -> None:
        profile = FreelancerRepository.get_profile_by_user_id(dbSession, user.id)
        eq = FreelancerRepository.get_equipment_by_id(dbSession, eq_id)
        if not eq:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Equipment not found."
            )
        if not profile or eq.freelancer_profile_id != profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this equipment."
            )

        FreelancerRepository.delete_equipment(dbSession, eq)
        FreelancerService.calculate_completion(dbSession, profile)

    # Portfolio Management
    @staticmethod
    def create_portfolio_item(dbSession: Session, user: User, item_data: dict) -> PortfolioItem:
        profile = FreelancerRepository.get_profile_by_user_id(dbSession, user.id)
        if not profile:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Freelancer profile not found."
            )

        # Enforce maximum featured limit (max 6)
        if item_data.get("is_featured") is True:
            featured_count = sum(1 for item in profile.portfolio if item.is_featured)
            if featured_count >= 6:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You can feature a maximum of 6 portfolio items."
                )

        item_data["freelancer_profile_id"] = profile.id
        item = FreelancerRepository.create_portfolio_item(dbSession, item_data)
        
        # Update completion
        FreelancerService.calculate_completion(dbSession, profile)
        return item

    @staticmethod
    def update_portfolio_item(dbSession: Session, user: User, item_id: int, update_data: dict) -> PortfolioItem:
        profile = FreelancerRepository.get_profile_by_user_id(dbSession, user.id)
        item = FreelancerRepository.get_portfolio_item_by_id(dbSession, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Portfolio item not found."
            )
        if not profile or item.freelancer_profile_id != profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this portfolio item."
            )

        # Enforce maximum featured limit (max 6)
        if update_data.get("is_featured") is True and not item.is_featured:
            featured_count = sum(1 for it in profile.portfolio if it.is_featured)
            if featured_count >= 6:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You can feature a maximum of 6 portfolio items."
                )

        updated_item = FreelancerRepository.update_portfolio_item(dbSession, item, update_data)
        FreelancerService.calculate_completion(dbSession, profile)
        return updated_item

    @staticmethod
    def toggle_featured_portfolio_item(dbSession: Session, user: User, item_id: int) -> PortfolioItem:
        profile = FreelancerRepository.get_profile_by_user_id(dbSession, user.id)
        item = FreelancerRepository.get_portfolio_item_by_id(dbSession, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Portfolio item not found."
            )
        if not profile or item.freelancer_profile_id != profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to modify this portfolio item."
            )

        new_featured_status = not item.is_featured
        
        # Enforce max 6 limit
        if new_featured_status is True:
            featured_count = sum(1 for it in profile.portfolio if it.is_featured)
            if featured_count >= 6:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="You can feature a maximum of 6 portfolio items."
                )

        updated_item = FreelancerRepository.update_portfolio_item(dbSession, item, {"is_featured": new_featured_status})
        return updated_item

    @staticmethod
    def delete_portfolio_item(dbSession: Session, user: User, item_id: int) -> None:
        profile = FreelancerRepository.get_profile_by_user_id(dbSession, user.id)
        item = FreelancerRepository.get_portfolio_item_by_id(dbSession, item_id)
        if not item:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Portfolio item not found."
            )
        if not profile or item.freelancer_profile_id != profile.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to delete this portfolio item."
            )

        FreelancerRepository.delete_portfolio_item(dbSession, item)
        FreelancerService.calculate_completion(dbSession, profile)

    # Seed Skills
    @staticmethod
    def seed_skills_if_empty(dbSession: Session) -> List[Skill]:
        """
        Pre-populates database with common creative skills if table is empty.
        """
        existing_skills = FreelancerRepository.get_skills(dbSession)
        if existing_skills:
            return existing_skills

        common_skills = [
            "Wedding Photography",
            "Portrait Photography",
            "Product Photography",
            "Fashion Photography",
            "Event Photography",
            "Cinematography",
            "Videography",
            "Drone Videography",
            "Adobe Premiere Pro",
            "DaVinci Resolve",
            "Final Cut Pro",
            "Adobe Lightroom",
            "Adobe Photoshop",
            "After Effects",
            "Color Grading",
            "Reel Editing",
            "Photo Retouching",
            "Motion Graphics",
        ]

        seeded = []
        for name in common_skills:
            seeded.append(FreelancerRepository.create_skill(dbSession, name))
        return seeded
