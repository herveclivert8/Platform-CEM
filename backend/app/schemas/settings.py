"""
Schémas Pydantic pour les réglages globaux de l'association
"""

from typing import Optional

from pydantic import ConfigDict, BaseModel, Field


class SocialLinksRead(BaseModel):
    facebook_url: Optional[str] = None
    x_url: Optional[str] = None
    linkedin_url: Optional[str] = None
    youtube_url: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class SocialLinksUpdate(BaseModel):
    facebook_url: Optional[str] = Field(None, max_length=512)
    x_url: Optional[str] = Field(None, max_length=512)
    linkedin_url: Optional[str] = Field(None, max_length=512)
    youtube_url: Optional[str] = Field(None, max_length=512)


class PaymentInfoRead(BaseModel):
    """Comptes Mobile Money affichés aux donateurs"""
    mobile_money_holder: Optional[str] = None
    mvola_number: Optional[str] = None
    orange_money_number: Optional[str] = None
    airtel_money_number: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class PaymentInfoUpdate(BaseModel):
    mobile_money_holder: Optional[str] = Field(None, max_length=255)
    mvola_number: Optional[str] = Field(None, max_length=255)
    orange_money_number: Optional[str] = Field(None, max_length=255)
    airtel_money_number: Optional[str] = Field(None, max_length=255)
