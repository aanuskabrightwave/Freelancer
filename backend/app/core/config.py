from typing import List, Union
from pydantic import AnyHttpUrl, field_validator
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

    # Database Configuration
    DB_HOST: str = "localhost"
    DB_PORT: int = 3306
    DB_NAME: str = "creative_marketplace"
    DB_USER: str = "root"
    DB_PASSWORD: str = "password"

    # Security
    SECRET_KEY: str = "change-this-in-production-at-least-32-characters"
    JWT_SECRET_KEY: str = "change-this-secret"
    JWT_REFRESH_SECRET_KEY: str = "change-this-refresh-secret"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

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
        # Split commas if any other origins are specified, default to frontend url
        origins = [o.strip() for o in self.FRONTEND_URL.split(",") if o.strip()]
        return origins


settings = Settings()
