from datetime import datetime
from typing import Optional
from decimal import Decimal
from pydantic import BaseModel


class FavouriteFreelancerOut(BaseModel):
    id: int
    client_id: int
    freelancer_profile_id: int
    created_at: datetime
    
    # Detailed fields for card rendering
    full_name: Optional[str] = None
    professional_title: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None
    starting_price: Optional[Decimal] = None
    profile_photo_url: Optional[str] = None
    average_rating: Optional[float] = None
    review_count: int = 0
    trust_badges: list[str] = []

    model_config = {"from_attributes": True}


class FavouriteServiceOut(BaseModel):
    id: int
    client_id: int
    service_id: int
    created_at: datetime

    # Detailed fields for card rendering
    title: Optional[str] = None
    freelancer_name: Optional[str] = None
    starting_price: Optional[Decimal] = None
    service_type: Optional[str] = None
    cover_image_url: Optional[str] = None
    average_rating: Optional[float] = None
    review_count: int = 0

    model_config = {"from_attributes": True}
