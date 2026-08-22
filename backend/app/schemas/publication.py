"""
Schémas Pydantic pour les publications (DTOs modifiés)
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class PublicationFormat(str, Enum):
    PDF = "pdf"
    RAPPORT = "rapport"


class PublicationBase(BaseModel):
    """Base schema pour publication"""
    title: str = Field(..., min_length=1, max_length=255)
    title_en: Optional[str] = Field(None, max_length=255)
    description: str = Field(..., min_length=1)
    description_en: Optional[str] = None
    thumbnail_url: Optional[str] = Field(None, max_length=512)
    file_url: Optional[str] = Field(None, max_length=512)
    format: PublicationFormat


class PublicationCreate(PublicationBase):
    """Schema pour créer une publication"""
    pass


class PublicationUpdate(BaseModel):
    """Schema pour modifier une publication"""
    title: Optional[str] = None
    title_en: Optional[str] = None
    description: Optional[str] = None
    description_en: Optional[str] = None
    thumbnail_url: Optional[str] = None
    file_url: Optional[str] = None
    format: Optional[PublicationFormat] = None


class Publication(PublicationBase):
    """Schema de response pour une publication"""
    id: int
    branch_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class PublicationWithDetails(Publication):
    """Publication avec détails antenne"""
    branch_name: Optional[str] = None
    branch_country: Optional[str] = None


class PublicationListResponse(BaseModel):
    """Response paginée pour lister les publications"""
    items: list[Publication]
    total: int
    page: int
    page_size: int
    total_pages: int
