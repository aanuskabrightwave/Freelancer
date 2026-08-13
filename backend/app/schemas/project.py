from pydantic import BaseModel, Field, ConfigDict
from decimal import Decimal
from typing import List, Optional
from datetime import datetime


class ProjectBase(BaseModel):
    title: str = Field(..., min_length=2, max_length=255)
    description: str = Field(..., min_length=5)
    project_type: str = Field("REMOTE")  # ON_SITE, REMOTE, HYBRID
    budget: Decimal = Field(..., gt=0)
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None


class ProjectCreate(ProjectBase):
    pass


class ProjectResponse(ProjectBase):
    id: int
    client_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ProposalBase(BaseModel):
    proposed_amount: Decimal = Field(..., gt=0)
    cover_letter: str = Field(..., min_length=10)


class ProposalCreate(ProposalBase):
    freelancer_profile_id: int


class ProposalResponse(ProposalBase):
    id: int
    project_id: int
    freelancer_profile_id: int
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
