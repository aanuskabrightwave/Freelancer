from typing import List, Union, Any
from pydantic import AnyHttpUrl, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore"
    )

    APP_NAME: str = "Creative Marketplace"
    APP_ENV: str = "development"
    APP_DEBUG: bool = True

    # Trust Badge Configs
    TOP_RATED_MIN_REVIEWS: int = 20
    TOP_RATED_MIN_RATING: float = 4.7
    TOP_RATED_MIN_COMPLETED_BOOKINGS: int = 20
    RISING_CREATOR_MIN_BOOKINGS: int = 3
    RISING_CREATOR_MAX_BOOKINGS: int = 20
    RISING_CREATOR_MIN_RATING: float = 4.5

    # Database Configuration
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "creative_marketplace"
    DB_USER: str = "root"
    DB_PASSWORD: str = "password"

    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_RECYCLE: int = 3600

    # Security
    SECRET_KEY: str = "change-this-in-production-at-least-32-characters"
    JWT_SECRET_KEY: str = "change-this-secret"
    JWT_REFRESH_SECRET_KEY: str = "change-this-refresh-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # Razorpay Settings
    RAZORPAY_KEY_ID: str = "rzp_test_mockkeyid123"
    RAZORPAY_KEY_SECRET: str = "mocksecret123"
    RAZORPAY_WEBHOOK_SECRET: str = "mockwebhooksecret123"
    PAYOUT_PROVIDER_MODE: str = "SIMULATED"  # "SIMULATED" or "LIVE"

    # Uploads Limits (MB)
    MAX_IMAGE_UPLOAD_MB: int = 10
    MAX_DOCUMENT_UPLOAD_MB: int = 20
    MAX_VIDEO_UPLOAD_MB: int = 100
    UPLOAD_STORAGE_PATH: str = "/app/uploads"

    # Email Settings
    MAIL_FROM: str = "noreply@example.com"
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""

    # Frontend URL (CORS origins)
    FRONTEND_URL: str = "http://localhost:3000"

    @property
    def database_url(self) -> str:
        return f"mysql+pymysql://{self.DB_USER}:{self.DB_PASSWORD}@{self.DB_HOST}:{self.DB_PORT}/{self.DB_NAME}"

    @property
    def cors_origins(self) -> List[str]:
        origins = [o.strip() for o in self.FRONTEND_URL.split(",") if o.strip()]
        return origins

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.APP_ENV == "production":
            if self.SECRET_KEY == "change-this-in-production-at-least-32-characters" or len(self.SECRET_KEY) < 32:
                raise ValueError("SECRET_KEY must be a unique, secure 32+ character key in production.")
            if self.JWT_SECRET_KEY == "change-this-secret" or "change-this-secret" in self.JWT_SECRET_KEY:
                raise ValueError("JWT_SECRET_KEY must not be default/placeholder in production.")
            if self.APP_DEBUG is True:
                raise ValueError("APP_DEBUG must be false in production.")
            if not self.DB_PASSWORD or self.DB_PASSWORD in ["password", "root"]:
                raise ValueError("Database password cannot be default or empty in production.")
            if "*" in self.FRONTEND_URL:
                raise ValueError("CORS origins cannot allow all (*) origins in production.")
            if self.RAZORPAY_KEY_SECRET == "mocksecret123":
                raise ValueError("Razorpay secret keys must be updated in production.")
        return self


settings = Settings()
