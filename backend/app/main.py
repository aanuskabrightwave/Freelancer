from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import settings

app = FastAPI(
    title=settings.APP_NAME,
    description="Production-ready API for the Creative Freelancer Marketplace",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    debug=settings.APP_DEBUG
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import os
from fastapi.staticfiles import StaticFiles

# Register v1 router
app.include_router(api_router, prefix="/api/v1")

# Ensure uploads directory exists and mount it statically
os.makedirs("/app/uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="/app/uploads"), name="uploads")


from app.core.database import SessionLocal
from app.services.service_service import ServiceService

@app.on_event("startup")
def on_startup():
    db = SessionLocal()
    try:
        ServiceService.seed_categories_if_empty(db)
    finally:
        db.close()

@app.get("/", tags=["Root"])
async def root():
    """
    Root API endpoint returning basic marketplace greeting.
    """
    return {
        "message": "Creative Marketplace API"
    }
