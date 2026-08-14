from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import and_
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession
from app.models.skill import Skill
from app.models.equipment import FreelancerEquipment
from app.models.portfolio import PortfolioItem


class FreelancerRepository:
    @staticmethod
    def get_profile_by_user_id(db: Session, user_id: int) -> Optional[FreelancerProfile]:
        """
        Fetch a freelancer profile by user ID.
        """
        return db.query(FreelancerProfile).filter(FreelancerProfile.user_id == user_id).first()

    @staticmethod
    def get_profile_by_id(db: Session, profile_id: int) -> Optional[FreelancerProfile]:
        """
        Fetch a freelancer profile by its primary key ID.
        """
        return db.query(FreelancerProfile).filter(FreelancerProfile.id == profile_id).first()

    @staticmethod
    def create_profile(db: Session, profile_data: dict) -> FreelancerProfile:
        """
        Create a new freelancer profile.
        """
        db_profile = FreelancerProfile(**profile_data)
        db.add(db_profile)
        db.commit()
        db.refresh(db_profile)
        return db_profile

    @staticmethod
    def update_profile(db: Session, profile: FreelancerProfile, update_data: dict) -> FreelancerProfile:
        """
        Update a freelancer profile.
        """
        for key, value in update_data.items():
            setattr(profile, key, value)
        db.commit()
        db.refresh(profile)
        return profile

    # Skills Querying
    @staticmethod
    def get_skills(db: Session) -> List[Skill]:
        """
        Retrieve all skills.
        """
        return db.query(Skill).all()

    @staticmethod
    def get_skill_by_name(db: Session, name: str) -> Optional[Skill]:
        """
        Fetch a skill by its exact name.
        """
        return db.query(Skill).filter(Skill.name == name.strip()).first()

    @staticmethod
    def create_skill(db: Session, name: str) -> Skill:
        """
        Create a new skill.
        """
        db_skill = Skill(name=name.strip())
        db.add(db_skill)
        db.commit()
        db.refresh(db_skill)
        return db_skill

    @staticmethod
    def get_skills_by_ids(db: Session, skill_ids: List[int]) -> List[Skill]:
        """
        Fetch multiple skills by their primary key IDs.
        """
        return db.query(Skill).filter(Skill.id.in_(skill_ids)).all()

    # Equipment CRUD
    @staticmethod
    def get_equipment_by_id(db: Session, equipment_id: int) -> Optional[FreelancerEquipment]:
        """
        Fetch an equipment item by its primary key.
        """
        return db.query(FreelancerEquipment).filter(FreelancerEquipment.id == equipment_id).first()

    @staticmethod
    def create_equipment(db: Session, equipment_data: dict) -> FreelancerEquipment:
        """
        Create an equipment record.
        """
        db_eq = FreelancerEquipment(**equipment_data)
        db.add(db_eq)
        db.commit()
        db.refresh(db_eq)
        return db_eq

    @staticmethod
    def update_equipment(db: Session, equipment: FreelancerEquipment, update_data: dict) -> FreelancerEquipment:
        """
        Update an equipment record.
        """
        for key, value in update_data.items():
            setattr(equipment, key, value)
        db.commit()
        db.refresh(equipment)
        return equipment

    @staticmethod
    def delete_equipment(db: Session, equipment: FreelancerEquipment) -> None:
        """
        Delete an equipment record.
        """
        db.delete(equipment)
        db.commit()

    # Portfolio CRUD
    @staticmethod
    def get_portfolio_item_by_id(db: Session, item_id: int) -> Optional[PortfolioItem]:
        """
        Fetch a portfolio item by its primary key.
        """
        return db.query(PortfolioItem).filter(PortfolioItem.id == item_id).first()

    @staticmethod
    def create_portfolio_item(db: Session, item_data: dict) -> PortfolioItem:
        """
        Create a portfolio item.
        """
        db_item = PortfolioItem(**item_data)
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
        return db_item

    @staticmethod
    def update_portfolio_item(db: Session, item: PortfolioItem, update_data: dict) -> PortfolioItem:
        """
        Update a portfolio item.
        """
        for key, value in update_data.items():
            setattr(item, key, value)
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def delete_portfolio_item(db: Session, item: PortfolioItem) -> None:
        """
        Delete a portfolio item.
        """
        db.delete(item)
        db.commit()

    # Public directory & queries
    @staticmethod
    def get_all_public_profiles(
        db: Session,
        page: int,
        page_size: int,
        profession: Optional[str] = None,
        city: Optional[str] = None
    ) -> List[FreelancerProfile]:
        """
        Retrieve paginated public freelancer profiles, matching filters if provided.
        """
        from sqlalchemy.orm import joinedload
        query = db.query(FreelancerProfile).options(
            joinedload(FreelancerProfile.user),
            joinedload(FreelancerProfile.badges)
        ).filter(FreelancerProfile.is_profile_public == True)
        
        if profession:
            query = query.filter(FreelancerProfile.primary_profession == profession.upper())
        if city:
            query = query.filter(FreelancerProfile.city.like(f"%{city.strip()}%"))

        offset = (page - 1) * page_size
        return query.order_by(FreelancerProfile.profile_completion_percentage.desc()).offset(offset).limit(page_size).all()
