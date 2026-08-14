from typing import Optional, Union
from sqlalchemy import or_
from sqlalchemy.orm import Session
from app.models.user import User


class UserRepository:
    @staticmethod
    def get_by_id(db: Session, user_id: int) -> Optional[User]:
        """
        Fetch a user by their database primary key.
        """
        return db.query(User).filter(User.id == user_id).first()

    @staticmethod
    def get_by_email(db: Session, email: str) -> Optional[User]:
        """
        Fetch a user by email address (case-insensitive search recommended).
        """
        return db.query(User).filter(User.email == email.lower().strip()).first()

    @staticmethod
    def get_by_phone(db: Session, phone: str) -> Optional[User]:
        """
        Fetch a user by phone number.
        """
        return db.query(User).filter(User.phone == phone.strip()).first()

    @staticmethod
    def get_by_login_id(db: Session, login_id: str) -> Optional[User]:
        """
        Fetch a user by their unique login ID.
        """
        return db.query(User).filter(User.login_id == login_id.lower().strip()).first()

    @staticmethod
    def get_by_email_or_phone(db: Session, identifier: str) -> Optional[User]:
        """
        Fetch a user by either email, phone number, or login ID.
        """
        cleaned = identifier.strip()
        cleaned_lower = cleaned.lower()
        return db.query(User).filter(
            or_(
                User.email == cleaned_lower,
                User.phone == cleaned,
                User.login_id == cleaned_lower
            )
        ).first()

    @staticmethod
    def create(db: Session, user_data: dict) -> User:
        """
        Create a new user record.
        """
        # Ensure email is lowercase
        if "email" in user_data:
            user_data["email"] = user_data["email"].lower().strip()
        if "phone" in user_data:
            user_data["phone"] = user_data["phone"].strip()

        db_user = User(**user_data)
        db.add(db_user)
        db.commit()
        db.refresh(db_user)
        return db_user

    @staticmethod
    def update(db: Session, db_user: User, update_data: dict) -> User:
        """
        Update an existing user record.
        """
        for key, value in update_data.items():
            if key == "email" and value:
                value = value.lower().strip()
            if key == "phone" and value:
                value = value.strip()
            setattr(db_user, key, value)
            
        db.commit()
        db.refresh(db_user)
        return db_user
