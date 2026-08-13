from typing import Generator
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.core.config import settings

# Create SQLAlchemy engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,  # checks connection before executing queries
    pool_recycle=3600,   # recycles connections after 1 hour to prevent timeout disconnects
)

# Create SessionLocal sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for models
Base = declarative_base()


def get_db() -> Generator:
    """
    Dependency generator that yields a database session and ensures it's closed
    after the request completes.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
