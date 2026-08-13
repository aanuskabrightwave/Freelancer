from decimal import Decimal
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator
from datetime import datetime

from app.models.service import ServiceType, ServiceStatus
from app.models.service_package import PackageType
from app.models.portfolio import MediaType
from app.models.service_requirement import RequirementFieldType


# Category Schemas
class ServiceCategoryOut(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None
    parent_id: Optional[int] = None
    subcategories: List["ServiceCategoryOut"] = []

    model_config = {"from_attributes": True}


# Deliverable Schemas
class DeliverableCreate(BaseModel):
    label: str = Field(..., min_length=1, max_length=100)
    value: str = Field(..., min_length=1, max_length=100)
    sort_order: int = 0


class DeliverableOut(BaseModel):
    id: int
    label: str
    value: str
    sort_order: int

    model_config = {"from_attributes": True}


# Package Schemas
class PackageCreate(BaseModel):
    package_type: PackageType
    name: str = Field(..., min_length=1, max_length=100)
    description: str = Field(..., min_length=1)
    price: Decimal = Field(..., ge=0)
    delivery_time_days: int = Field(..., ge=0)
    revisions: int = Field(..., ge=0)
    deliverables: Optional[List[DeliverableCreate]] = None


class PackageOut(BaseModel):
    id: int
    service_id: int
    package_type: PackageType
    name: str
    description: str
    price: Decimal
    delivery_time_days: int
    revisions: int
    deliverables: List[DeliverableOut] = []

    model_config = {"from_attributes": True}


# Media Schemas
class ServiceMediaCreate(BaseModel):
    media_type: MediaType
    media_url: str = Field(..., min_length=1, max_length=500)
    thumbnail_url: Optional[str] = None
    is_cover: bool = False


class ServiceMediaOut(BaseModel):
    id: int
    service_id: int
    media_type: MediaType
    media_url: str
    thumbnail_url: Optional[str] = None
    is_cover: bool
    sort_order: int

    model_config = {"from_attributes": True}


# Requirement Schemas
class RequirementCreate(BaseModel):
    question: str = Field(..., min_length=1, max_length=500)
    field_type: RequirementFieldType
    is_required: bool = True
    sort_order: int = 0


class RequirementOut(BaseModel):
    id: int
    service_id: int
    question: str
    field_type: RequirementFieldType
    is_required: bool
    sort_order: int

    model_config = {"from_attributes": True}


# Service Main Schemas
class ServiceCreate(BaseModel):
    title: str = Field(..., min_length=10, max_length=150)
    short_description: str = Field(..., min_length=1, max_length=300)
    description: str = Field(..., min_length=1, max_length=5000)
    service_type: ServiceType
    
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None

    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    service_radius_km: Optional[int] = Field(None, ge=1)
    travel_available: bool = False
    travel_fee: Optional[Decimal] = Field(None, ge=0)


class ServiceUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=10, max_length=150)
    short_description: Optional[str] = Field(None, min_length=1, max_length=300)
    description: Optional[str] = Field(None, min_length=1, max_length=5000)
    service_type: Optional[ServiceType] = None
    
    category_id: Optional[int] = None
    subcategory_id: Optional[int] = None

    city: Optional[str] = Field(None, max_length=100)
    state: Optional[str] = Field(None, max_length=100)
    country: Optional[str] = Field(None, max_length=100)
    service_radius_km: Optional[int] = Field(None, ge=1)
    travel_available: Optional[bool] = None
    travel_fee: Optional[Decimal] = Field(None, ge=0)


class ServiceOut(BaseModel):
    id: int
    freelancer_profile_id: int
    title: str
    slug: str
    short_description: str
    description: str
    service_type: ServiceType
    
    category_id: Optional[int]
    subcategory_id: Optional[int]

    starting_price: Decimal
    delivery_time_days: Optional[int]
    revisions: Optional[int]
    
    is_active: bool
    is_featured: bool
    status: ServiceStatus

    city: Optional[str]
    state: Optional[str]
    country: Optional[str]
    service_radius_km: Optional[int]
    travel_available: bool
    travel_fee: Optional[Decimal]

    created_at: datetime
    updated_at: datetime

    category: Optional[ServiceCategoryOut] = None
    subcategory: Optional[ServiceCategoryOut] = None
    packages: List[PackageOut] = []
    media: List[ServiceMediaOut] = []
    requirements: List[RequirementOut] = []

    model_config = {"from_attributes": True}


class FreelancerSummary(BaseModel):
    id: int
    full_name: str
    professional_title: str
    profile_photo_url: Optional[str] = None


class PublicServiceOut(BaseModel):
    id: int
    title: str
    slug: str
    short_description: str
    description: str
    service_type: ServiceType
    starting_price: Decimal
    
    city: Optional[str]
    state: Optional[str]
    country: Optional[str]
    service_radius_km: Optional[int]
    travel_available: bool
    travel_fee: Optional[Decimal]

    freelancer: Optional[FreelancerSummary] = None
    packages: List[PackageOut] = []
    media: List[ServiceMediaOut] = []
    requirements: List[RequirementOut] = []
    category: Optional[ServiceCategoryOut] = None
    subcategory: Optional[ServiceCategoryOut] = None

    model_config = {"from_attributes": True}
