import re
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator
from app.models.user import UserRole


class UserBase(BaseModel):
    full_name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    phone: str = Field(...)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        # Strip all whitespace and dashes/parentheses
        cleaned = re.sub(r"[\s\-\(\)]", "", v)
        # Check standard E.164-like phone number: optional +, then 7-15 digits
        if not re.match(r"^\+?[0-9]{7,15}$", cleaned):
            raise ValueError(
                "Phone number must be a valid normalized number containing 7 to 15 digits, optionally prefixed with '+'"
            )
        return cleaned


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    role: UserRole

    @field_validator("role")
    @classmethod
    def validate_role(cls, v: UserRole) -> UserRole:
        if v == UserRole.ADMIN:
            raise ValueError("Public registration for ADMIN is forbidden")
        return v

    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


class UserUpdate(BaseModel):
    full_name: Optional[str] = Field(None, min_length=2, max_length=100)
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = Field(None, min_length=8)
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return v
        cleaned = re.sub(r"[\s\-\(\)]", "", v)
        if not re.match(r"^\+?[0-9]{7,15}$", cleaned):
            raise ValueError("Invalid phone number format")
        return cleaned


class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: str
    role: UserRole
    is_verified: bool
    is_active: bool

    model_config = {
        "from_attributes": True
    }


class UserRegisterResponse(BaseModel):
    message: str = "Account created successfully"
    user: UserOut


# Login Schemas
class LoginRequest(BaseModel):
    identifier: str = Field(..., description="Email or phone number")
    password: str = Field(...)


class TokenPayload(BaseModel):
    sub: str
    role: Optional[str] = None
    type: str


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: UserOut


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class RefreshTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# Password Reset Schemas
class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

    @field_validator("new_password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one number")
        return v


# Email Verification Schemas
class VerifyEmailRequest(BaseModel):
    token: str
