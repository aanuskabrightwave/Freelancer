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
import time
import uuid
from collections import defaultdict
from fastapi import Request
from fastapi.staticfiles import StaticFiles
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, max_requests: int = 150, window_seconds: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.request_history = defaultdict(list)
        self.custom_rules = {
            "/api/v1/auth/login": (5, 60),
            "/api/v1/auth/register": (5, 60),
            "/api/v1/auth/forgot-password": (5, 60),
            "/api/v1/auth/reset-password": (5, 60),
            "/api/v1/bookings": (15, 60),
            "/api/v1/messages": (30, 60),
        }

    async def dispatch(self, request: Request, call_next):
        import sys
        if "pytest" in sys.modules:
            return await call_next(request)

        path = request.url.path
        if path.startswith(("/docs", "/redoc", "/openapi.json", "/api/v1/health")) or request.method == "OPTIONS":
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.time()

        limit, window = self.max_requests, self.window_seconds
        for prefix, rule in self.custom_rules.items():
            if path.startswith(prefix):
                limit, window = rule
                break

        key = f"{client_ip}:{path}" if any(path.startswith(p) for p in self.custom_rules) else client_ip
        history = self.request_history[key]
        self.request_history[key] = [t for t in history if now - t < window]

        if len(self.request_history[key]) >= limit:
            return JSONResponse(
                status_code=429,
                content={"detail": "Too many requests. Please try again later."}
            )

        self.request_history[key].append(now)
        return await call_next(request)


class RequestIdLoggingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id

        start_time = time.time()
        response = await call_next(request)
        duration = time.time() - start_time

        response.headers["X-Request-ID"] = request_id
        # Safe logging without request body parameters
        print(f"Request: {request.method} {request.url.path} - Status: {response.status_code} - ID: {request_id} - Duration: {duration:.4f}s")
        return response


# Register Middlewares
app.add_middleware(RateLimitMiddleware)
app.add_middleware(RequestIdLoggingMiddleware)

# Register v1 router
app.include_router(api_router, prefix="/api/v1")

# Ensure uploads directories exist and mount ONLY public subfolders statically
uploads_base = os.path.normpath(settings.UPLOAD_STORAGE_PATH)
os.makedirs(os.path.join(uploads_base, "profiles"), exist_ok=True)
os.makedirs(os.path.join(uploads_base, "portfolios"), exist_ok=True)
os.makedirs(os.path.join(uploads_base, "services"), exist_ok=True)

app.mount("/uploads/profiles", StaticFiles(directory=os.path.join(uploads_base, "profiles")), name="profiles")
app.mount("/uploads/portfolios", StaticFiles(directory=os.path.join(uploads_base, "portfolios")), name="portfolios")
app.mount("/uploads/services", StaticFiles(directory=os.path.join(uploads_base, "services")), name="services")


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
