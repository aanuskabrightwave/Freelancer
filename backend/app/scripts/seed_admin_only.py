import sys
from pathlib import Path

# Add the parent directory to sys.path so we can import 'app'
current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent
sys.path.append(str(parent_dir))

from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine, Base
from app.models.user import User, UserRole
from app.core.security import get_password_hash

def seed_admin():
    db = SessionLocal()
    try:
        # Check if admin already exists
        existing_admin = db.query(User).filter(User.email == "admin@gmail.com").first()
        if existing_admin:
            print("Admin user already exists.")
            return

        # Create admin
        admin_user = User(
            email="admin@gmail.com",
            password_hash=get_password_hash("admin123"),
            full_name="System Admin",
            phone="+1234567890",
            role=UserRole.ADMIN,
            is_verified=True,
            is_active=True
        )
        
        db.add(admin_user)
        db.commit()
        print("Admin user created successfully with email: admin@gmail.com and password: admin123")
        
    except Exception as e:
        db.rollback()
        print(f"Error seeding admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting seeding process...")
    seed_admin()
    print("Seeding complete.")
