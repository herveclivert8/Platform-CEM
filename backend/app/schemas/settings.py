"""
Schémas Pydantic pour les réglages globaux de l'association
"""

from typing import Optional

from pydantic import BaseModel, Field


class SocialLinksRead(BaseModel):
    facebook_url: Optional[str] = None
    x_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    youtube_url: Optional[str] = None

    class Config:
        from_attributes = True


class SocialLinksUpdate(BaseModel):
    facebook_url: Optional[str] = Field(None, max_length=512)
    x_url: Optional[str] = Field(None, max_length=512)
    linkedin_url: Optional[str] = Field(None, max_length=512)
    youtube_url: Optional[str] = Field(None, max_length=512)
