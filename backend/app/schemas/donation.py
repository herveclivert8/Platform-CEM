from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class DonationCreate(BaseModel):
    branch_id: Optional[int] = None
    amount: float = Field(..., gt=0)
    donor_email: EmailStr


class Donation(BaseModel):
    id: int
    branch_id: Optional[int] = None
    amount: float
    donor_email: str
    created_at: datetime

    class Config:
        from_attributes = True


class DonationListResponse(BaseModel):
    items: list[Donation]
    total: int
    page: int
    page_size: int
    total_pages: int
