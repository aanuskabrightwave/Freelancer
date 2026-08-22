from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from decimal import Decimal

class ChangePasswordPayload(BaseModel):
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)

    @model_validator(mode="after")
    def passwords_match(self) -> "ChangePasswordPayload":
        if self.new_password != self.confirm_password:
            raise ValueError("New password and confirmation must match")
        return self

class ClientSettingsUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)

class FreelancerSettingsUpdate(BaseModel):
    full_name: Optional[str] = Field(None, max_length=100)
    is_profile_public: Optional[bool] = None
    preferred_categories: Optional[str] = None
    preferred_budget_min: Optional[Decimal] = Field(None, ge=0)
    preferred_budget_max: Optional[Decimal] = Field(None, ge=0)
    preferred_work_mode: Optional[str] = Field(None, max_length=50)
    preferred_locations: Optional[str] = Field(None, max_length=255)
    open_to_remote: Optional[bool] = None

    @model_validator(mode="after")
    def validate_budget_range(self) -> "FreelancerSettingsUpdate":
        if self.preferred_budget_min is not None and self.preferred_budget_max is not None:
            if self.preferred_budget_max < self.preferred_budget_min:
                raise ValueError("Maximum preferred budget cannot be less than minimum preferred budget")
        return self

class ClientSettingsOut(BaseModel):
    full_name: str
    email: str
    phone: str
    is_active: bool
    role: str

    class Config:
        from_attributes = True

class FreelancerSettingsOut(BaseModel):
    full_name: str
    email: str
    phone: str
    is_active: bool
    role: str
    is_profile_public: bool
    profile_completion_percentage: int
    verification_status: str
    payout_status: str
    
    preferred_categories: Optional[str] = None
    preferred_budget_min: Optional[Decimal] = None
    preferred_budget_max: Optional[Decimal] = None
    preferred_work_mode: Optional[str] = None
    preferred_locations: Optional[str] = None
    open_to_remote: Optional[bool] = None

    class Config:
        from_attributes = True
