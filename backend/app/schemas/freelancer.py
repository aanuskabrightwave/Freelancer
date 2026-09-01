from datetime import date
from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, HttpUrl, field_validator
from app.models.freelancer_profile import FreelancerProfession, VerificationStatus
from app.models.equipment import EquipmentType
from app.models.portfolio import MediaType


# Skill Schemas
class SkillOut(BaseModel):
    id: int
    name: str

    model_config = {"from_attributes": True}


class SkillAssociateRequest(BaseModel):
    skill_ids: List[int]


# Equipment Schemas
class EquipmentCreate(BaseModel):
    equipment_type: EquipmentType
    brand: str = Field(..., min_length=1, max_length=100)
    model: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = None


class EquipmentOut(BaseModel):
    id: int
    freelancer_profile_id: int
    equipment_type: EquipmentType
    brand: str
    model: str
    description: Optional[str]

    model_config = {"from_attributes": True}


# Portfolio Schemas
class PortfolioCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    description: Optional[str] = None
    media_type: MediaType
    media_url: str = Field(..., min_length=1, max_length=500)
    thumbnail_url: Optional[str] = None
    category: str = Field(..., min_length=1, max_length=100)
    project_date: Optional[date] = None
    is_featured: bool = False

    @field_validator("media_url")
    @classmethod
    def validate_media_url(cls, v: str, info) -> str:
        # If it's an external video, perform basic URL validation
        # Pydantic HttpUrl will validate it, but for custom verification let's check it starts with http
        if not v.startswith("http://") and not v.startswith("https://") and not v.startswith("/uploads/"):
            raise ValueError("Media URL must be a valid HTTP/HTTPS URL or absolute upload path")
        return v


class PortfolioOut(BaseModel):
    id: int
    freelancer_profile_id: int
    title: str
    description: Optional[str]
    media_type: MediaType
    media_url: str
    thumbnail_url: Optional[str]
    category: str
    project_date: Optional[date]
    is_featured: bool
    sort_order: int

    model_config = {"from_attributes": True}


# Profile Schemas
class FreelancerProfileBase(BaseModel):
    professional_title: Optional[str] = Field(None, max_length=120)
    primary_profession: FreelancerProfession
    bio: Optional[str] = Field(None, min_length=30, max_length=2000)
    experience_years: Optional[int] = Field(None, ge=0, le=50)

    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)

    service_radius_km: Optional[int] = Field(None, ge=1)
    willing_to_travel: bool = False

    starting_price: Optional[Decimal] = Field(None, ge=0)
    hourly_rate: Optional[Decimal] = Field(None, ge=0)
    event_rate: Optional[Decimal] = Field(None, ge=0)

    profile_photo_url: Optional[str] = None
    cover_photo_url: Optional[str] = None
    website: Optional[str] = Field(None, max_length=500)
    instagram: Optional[str] = Field(None, max_length=500)
    behance: Optional[str] = Field(None, max_length=500)
    is_profile_public: Optional[bool] = False


class FreelancerProfileCreate(FreelancerProfileBase):
    pass


class FreelancerProfileUpdate(BaseModel):
    professional_title: Optional[str] = Field(None, max_length=120)
    primary_profession: Optional[FreelancerProfession] = None
    bio: Optional[str] = Field(None, min_length=30, max_length=2000)
    experience_years: Optional[int] = Field(None, ge=0, le=50)

    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)

    service_radius_km: Optional[int] = Field(None, ge=1)
    willing_to_travel: Optional[bool] = None

    starting_price: Optional[Decimal] = Field(None, ge=0)
    hourly_rate: Optional[Decimal] = Field(None, ge=0)
    event_rate: Optional[Decimal] = Field(None, ge=0)

    profile_photo_url: Optional[str] = None
    cover_photo_url: Optional[str] = None
    website: Optional[str] = Field(None, max_length=500)
    instagram: Optional[str] = Field(None, max_length=500)
    behance: Optional[str] = Field(None, max_length=500)
    is_profile_public: Optional[bool] = None


class FreelancerProfileOut(BaseModel):
    id: int
    user_id: int
    full_name: Optional[str] = None
    professional_title: Optional[str] = None
    primary_profession: FreelancerProfession
    bio: Optional[str] = None
    experience_years: Optional[int] = None
    
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None

    service_radius_km: Optional[int]
    willing_to_travel: bool

    starting_price: Optional[Decimal]
    hourly_rate: Optional[Decimal]
    event_rate: Optional[Decimal]

    profile_photo_url: Optional[str]
    cover_photo_url: Optional[str]
    website: Optional[str] = None
    instagram: Optional[str] = None
    behance: Optional[str] = None

    profile_completion_percentage: int
    verification_status: VerificationStatus
    is_profile_public: bool

    average_rating: Optional[float] = None
    review_count: int = 0
    completed_jobs_count: int = 0
    trust_badges: List[str] = []

    skills: List[SkillOut] = []
    equipment: List[EquipmentOut] = []
    portfolio: List[PortfolioOut] = []

    model_config = {"from_attributes": True}


class PublicFreelancerProfileOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    professional_title: Optional[str] = None
    primary_profession: FreelancerProfession
    bio: Optional[str] = None
    experience_years: Optional[int] = None
    
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None

    service_radius_km: Optional[int]
    willing_to_travel: bool

    starting_price: Optional[Decimal]
    hourly_rate: Optional[Decimal]
    event_rate: Optional[Decimal]

    profile_photo_url: Optional[str]
    cover_photo_url: Optional[str]
    website: Optional[str] = None
    instagram: Optional[str] = None
    behance: Optional[str] = None

    verification_status: VerificationStatus
    
    average_rating: Optional[float] = None
    review_count: int = 0
    completed_jobs_count: int = 0
    trust_badges: List[str] = []

    skills: List[SkillOut] = []
    equipment: List[EquipmentOut] = []
    portfolio: List[PortfolioOut] = []

    model_config = {"from_attributes": True}
