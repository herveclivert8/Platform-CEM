from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator

from app.models.city import CityStatus, ProjectCategory, NewsCategory
from app.utils.sanitize import sanitize_string, sanitize_email, sanitize_slug


class CityProjectCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str = Field(..., min_length=1)
    category: ProjectCategory
    image_url: Optional[str] = None
    progress: int = Field(default=0, ge=0, le=100)
    target_amount: Optional[float] = None
    raised_amount: Optional[float] = None
    status: str = Field(default="active")


class CityProjectRead(CityProjectCreate):
    id: int
    city_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CityNewsCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    excerpt: Optional[str] = None
    category: NewsCategory
    image_url: Optional[str] = None
    published: bool = False
    published_at: Optional[datetime] = None


class CityNewsRead(CityNewsCreate):
    id: int
    city_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CityTeamMemberCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    role: str = Field(..., min_length=1, max_length=100)
    email: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = None
    image_url: Optional[str] = None
    bio: Optional[str] = None


class CityTeamMemberRead(CityTeamMemberCreate):
    id: int
    city_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class CityCreate(BaseModel):
    slug: str = Field(..., min_length=2, max_length=100, pattern=r"^[a-z0-9-]+$")
    name: str = Field(..., min_length=1, max_length=255)
    country: str = Field(..., min_length=1, max_length=100)
    continent: str = Field(..., min_length=1, max_length=50)
    latitude: float = Field(..., ge=-90, le=90)
    longitude: float = Field(..., ge=-180, le=180)
    description: Optional[str] = None
    hero_image: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    physical_address: Optional[str] = None
    status: CityStatus = Field(default=CityStatus.ACTIVE)
    active_projects: int = Field(default=0, ge=0)
    active_volunteers: int = Field(default=0, ge=0)
    beneficiaries: int = Field(default=0, ge=0)
    years_present: int = Field(default=0, ge=0)

    @field_validator('slug')
    @classmethod
    def validate_slug(cls, v: str) -> str:
        return sanitize_slug(v)

    @field_validator('name', 'country', 'continent', 'physical_address')
    @classmethod
    def validate_text_fields(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return sanitize_string(v)

    @field_validator('contact_email')
    @classmethod
    def validate_email(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        return sanitize_email(v)


class CityRead(CityCreate):
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CityWithDetails(CityRead):
    projects: list[CityProjectRead] = []
    news: list[CityNewsRead] = []
    team_members: list[CityTeamMemberRead] = []


class CityPaginated(BaseModel):
    data: list[CityRead]
    total: int
    page: int
    limit: int
    total_pages: int
