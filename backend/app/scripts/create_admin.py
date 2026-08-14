import sys
import os

# Add root folder to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.database import SessionLocal
from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.repositories.user_repository import UserRepository


def create_admin():
    db = SessionLocal()
    try:
        print("=== Create Administrator Account ===")
        full_name = input("Enter Full Name: ").strip()
        email = input("Enter Email Address: ").strip()
        phone = input("Enter Phone Number: ").strip()
        password = input("Enter Password: ").strip()

        if not full_name or not email or not phone or not password:
            print("All fields are required.")
            return

        # Check if already exists
        if UserRepository.get_by_email(db, email):
            print(f"A user with email '{email}' already exists.")
            return

        user_data = {
            "full_name": full_name,
            "email": email,
            "phone": phone,
            "password_hash": get_password_hash(password),
            "role": UserRole.ADMIN,
            "is_active": True,
            "is_verified": True,
            "is_phone_verified": True
        }

        user = User(**user_data)
        db.add(user)
        db.commit()
        db.refresh(user)
        print(f"Successfully created admin user: {user.full_name} ({user.email})")

    except Exception as e:
        print(f"Error creating admin: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    create_admin()
