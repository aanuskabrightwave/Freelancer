import sys
from pathlib import Path
from sqlalchemy import create_engine, MetaData, text
from sqlalchemy.orm import Session
import subprocess
import time

current_dir = Path(__file__).resolve().parent
parent_dir = current_dir.parent
sys.path.append(str(parent_dir))

# Connect directly to the host's Windows MySQL instance
SQLALCHEMY_DATABASE_URL = "mysql+pymysql://root:root@host.docker.internal:3306/creative_marketplace"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
metadata = MetaData()

def drop_all_tables():
    print("Connecting to database to drop all tables...")
    metadata.reflect(bind=engine)
    
    # Disable foreign key checks to allow dropping tables in any order
    with engine.begin() as conn:
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 0;"))
        
        metadata.drop_all(bind=engine)
        
        # We also need to drop alembic_version manually
        try:
            conn.execute(text("DROP TABLE IF EXISTS alembic_version"))
        except Exception:
            pass
            
        conn.execute(text("SET FOREIGN_KEY_CHECKS = 1;"))
        conn.commit()
        
    print("Successfully dropped all tables.")

def run_migrations():
    print("Running Alembic migrations to recreate tables...")
    try:
        subprocess.run(["alembic", "upgrade", "head"], cwd=str(parent_dir), check=True)
        print("Migrations ran successfully.")
    except Exception as e:
        print(f"Error running migrations: {e}")

if __name__ == "__main__":
    try:
        drop_all_tables()
        run_migrations()
        
        # Now seed admin user
        from app.scripts.seed_admin_only import seed_admin
        seed_admin()
        
        print("\nAll database operations completed successfully.")
    except Exception as e:
        print(f"Failed: {e}")
