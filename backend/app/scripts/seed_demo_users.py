import os
import sys

# Add root folder to sys.path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from app.core.config import settings
from app.core.database import SessionLocal
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.models.freelancer_profile import FreelancerProfile, FreelancerProfession, VerificationStatus
from app.repositories.user_repository import UserRepository
from app.repositories.freelancer_repository import FreelancerRepository


def seed_demo_users():
    # DEVELOPMENT/DEMO ONLY
    print("=== DEVELOPMENT/DEMO ONLY SEED MECHANISM ===")
    
    # 1. Environment Safety Check
    if settings.APP_ENV == "production":
        print("ERROR: Refusing to seed demo accounts in PRODUCTION environment.")
        sys.exit(1)
        
    db = SessionLocal()
    try:
        # 2. Seed Admin Account
        admin_login_id = "admin01"
        admin = UserRepository.get_by_login_id(db, admin_login_id)
        if not admin:
            user_data = {
                "login_id": admin_login_id,
                "full_name": "Demo Admin",
                "email": "admin01@test.com",
                "phone": "+910000000003",
                "password_hash": get_password_hash("Admin@123"),
                "role": UserRole.ADMIN,
                "is_active": True,
                "is_verified": True,
                "is_phone_verified": True
            }
            admin_user = User(**user_data)
            db.add(admin_user)
            db.commit()
            print(f"Created Admin account: {admin_login_id}")
        else:
            print(f"Admin account: {admin_login_id} already exists")

        # 3. Seed Client Account
        client_login_id = "client01"
        client = UserRepository.get_by_login_id(db, client_login_id)
        if not client:
            user_data = {
                "login_id": client_login_id,
                "full_name": "Demo Client",
                "email": "client01@test.com",
                "phone": "+910000000001",
                "password_hash": get_password_hash("Client@123"),
                "role": UserRole.CLIENT,
                "is_active": True,
                "is_verified": True,
                "is_phone_verified": True
            }
            client_user = User(**user_data)
            db.add(client_user)
            db.commit()
            print(f"Created Client account: {client_login_id}")
        else:
            print(f"Client account: {client_login_id} already exists")

        # 4. Seed Freelancer Account
        freelancer_login_id = "freelancer01"
        freelancer = UserRepository.get_by_login_id(db, freelancer_login_id)
        if not freelancer:
            user_data = {
                "login_id": freelancer_login_id,
                "full_name": "Demo Freelancer",
                "email": "freelancer01@test.com",
                "phone": "+910000000002",
                "password_hash": get_password_hash("Freelancer@123"),
                "role": UserRole.FREELANCER,
                "is_active": True,
                "is_verified": True,
                "is_phone_verified": True
            }
            freelancer_user = User(**user_data)
            db.add(freelancer_user)
            db.commit()
            db.refresh(freelancer_user)
            print(f"Created Freelancer account: {freelancer_login_id}")
            
            # Create associated Freelancer Profile
            profile_data = {
                "user_id": freelancer_user.id,
                "professional_title": "Professional Photographer & Videographer",
                "primary_profession": FreelancerProfession.PHOTOGRAPHER,
                "bio": "Professional photographer and videographer available for marketplace testing.",
                "experience_years": 5,
                "city": "Mumbai",
                "state": "Maharashtra",
                "country": "India",
                "profile_completion_percentage": 100,
                "is_profile_public": True,
                "verification_status": VerificationStatus.VERIFIED
            }
            FreelancerRepository.create_profile(db, profile_data)
            print(f"Created FreelancerProfile for: {freelancer_login_id}")
        else:
            print(f"Freelancer account: {freelancer_login_id} already exists")
            
            # Ensure freelancer profile is also present
            profile = FreelancerRepository.get_profile_by_user_id(db, freelancer.id)
            if not profile:
                profile_data = {
                    "user_id": freelancer.id,
                    "professional_title": "Professional Photographer & Videographer",
                    "primary_profession": FreelancerProfession.PHOTOGRAPHER,
                    "bio": "Professional photographer and videographer available for marketplace testing.",
                    "experience_years": 5,
                    "city": "Mumbai",
                    "state": "Maharashtra",
                    "country": "India",
                    "profile_completion_percentage": 100,
                    "is_profile_public": True,
                    "verification_status": VerificationStatus.VERIFIED
                }
                FreelancerRepository.create_profile(db, profile_data)
                print(f"Created missing FreelancerProfile for existing freelancer: {freelancer_login_id}")
            else:
                print(f"FreelancerProfile for: {freelancer_login_id} already exists")

    except Exception as e:
        print(f"Error seeding demo users: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_demo_users()
