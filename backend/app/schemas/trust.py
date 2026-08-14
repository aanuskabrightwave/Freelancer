from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TrustBadgeOut(BaseModel):
    id: int
    code: str
    name: str
    description: Optional[str] = None
    icon: Optional[str] = None
    is_active: bool

    model_config = {"from_attributes": True}


class FreelancerBadgeOut(BaseModel):
    id: int
    freelancer_profile_id: int
    badge: TrustBadgeOut
    source: str
    awarded_at: datetime
    expires_at: Optional[datetime] = None
    is_active: bool

    model_config = {"from_attributes": True}
