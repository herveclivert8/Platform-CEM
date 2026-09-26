"""
Schémas Pydantic pour les branches (DTOs)
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class BranchStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"


class TeamMemberInput(BaseModel):
    """Schema pour créer/remplacer un membre d'équipe (écriture)"""
    name: str = Field(..., min_length=1, max_length=255)
    role: str = Field(..., min_length=1, max_length=255)
    photo_url: Optional[str] = Field(None, max_length=512)


class TeamMember(TeamMemberInput):
    """Schema de réponse pour un membre d'équipe (lecture)"""
    id: int
    position: int = 0

    model_config = ConfigDict(from_attributes=True)


class BranchManagerRead(BaseModel):
    """Aperçu du responsable (Admin d'Antenne) d'une branche"""
    id: int
    full_name: str
    email: str
    avatar_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BranchBase(BaseModel):
    """Base schema pour branch"""
    name: str = Field(..., min_length=1, max_length=255)
    country: str = Field(..., min_length=1, max_length=100)
    continent: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None
    logo_url: Optional[str] = Field(None, max_length=512)
    banner_url: Optional[str] = Field(None, max_length=512)
    contact_name: Optional[str] = Field(None, max_length=255)
    contact_email: Optional[str] = Field(None, max_length=255)
    contact_phone: Optional[str] = Field(None, max_length=20)
    physical_address: Optional[str] = Field(None, max_length=512)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: BranchStatus = BranchStatus.ACTIVE


class BranchCreate(BranchBase):
    """Schema pour créer une branch"""
    team_members: list[TeamMemberInput] = []


class BranchUpdate(BaseModel):
    """Schema pour modifier une branch"""
    name: Optional[str] = None
    country: Optional[str] = None
    continent: Optional[str] = None
    description: Optional[str] = None
    logo_url: Optional[str] = None
    banner_url: Optional[str] = None
    contact_name: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    physical_address: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    status: Optional[BranchStatus] = None
    team_members: Optional[list[TeamMemberInput]] = None


class Branch(BranchBase):
    """Schema de response pour une branch"""
    id: int
    manager_id: Optional[int] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BranchWithStats(Branch):
    """Branch avec statistiques, responsable et équipe (détail complet - GET /branches/{id})"""
    publication_count: int = 0
    visitor_count: int = 0
    admin_count: int = 0
    manager: Optional[BranchManagerRead] = None
    team_members: list[TeamMember] = []


class BranchListResponse(BaseModel):
    """Response paginée pour lister les branches"""
    items: list[Branch]
    total: int
    page: int
    page_size: int
    total_pages: int
