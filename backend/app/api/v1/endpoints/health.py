from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.core.database import get_db

router = APIRouter()


@router.get("", status_code=status.HTTP_200_OK)
async def check_health():
    """
    General service health check.
    """
    return {
        "status": "healthy",
        "service": "creative-marketplace-api"
    }


@router.get("/database", status_code=status.HTTP_200_OK)
async def check_database_health(db: Session = Depends(get_db)):
    """
    Database health check. Attempst to execute a simple query to verify connection status.
    """
    try:
        # Execute simple query to test connection
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "database": "connected"
        }
    except Exception as e:
        # Log error or return 503 service unavailable
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "unhealthy",
                "database": "disconnected",
                "error": str(e)
            }
        )
