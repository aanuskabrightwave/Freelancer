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
        
        # Create or update brightwave admin
        bw_admin = db.query(User).filter(User.email == "admin@brightwavesoftware.com").first()
        if not bw_admin:
            phone_cand = "+919000000002"
            while db.query(User).filter(User.phone == phone_cand).first():
                phone_int = int(phone_cand.replace("+91", "")) + 1
                phone_cand = f"+91{phone_int}"
            bw_user = User(
                email="admin@brightwavesoftware.com",
                password_hash=get_password_hash("Admin@1234"),
                full_name="Brightwave Admin",
                phone=phone_cand,
                login_id="ADM-BW001",
                role=UserRole.ADMIN,
                is_verified=True,
                is_active=True,
                is_phone_verified=True
            )
            db.add(bw_user)
            db.commit()
            print("Admin user created successfully with email: admin@brightwavesoftware.com and password: Admin@1234")
        else:
            bw_admin.password_hash = get_password_hash("Admin@1234")
            bw_admin.role = UserRole.ADMIN
            bw_admin.is_verified = True
            bw_admin.is_active = True
            db.commit()
            print("Admin user admin@brightwavesoftware.com updated successfully.")
    except Exception as e:
        db.rollback()
        print(f"Error seeding admin: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    print("Starting seeding process...")
    seed_admin()
    print("Seeding complete.")
