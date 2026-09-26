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


class HomeHeroRead(BaseModel):
    """Couverture de la page d'accueil ; un champ à null = valeur par défaut du site"""
    hero_image_url: Optional[str] = None
    hero_badge_fr: Optional[str] = None
    hero_badge_en: Optional[str] = None
    hero_title_fr: Optional[str] = None
    hero_title_en: Optional[str] = None
    hero_subtitle_fr: Optional[str] = None
    hero_subtitle_en: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class HomeHeroUpdate(BaseModel):
    hero_image_url: Optional[str] = Field(None, max_length=512)
    hero_badge_fr: Optional[str] = Field(None, max_length=255)
    hero_badge_en: Optional[str] = Field(None, max_length=255)
    hero_title_fr: Optional[str] = Field(None, max_length=200)
    hero_title_en: Optional[str] = Field(None, max_length=200)
    hero_subtitle_fr: Optional[str] = Field(None, max_length=500)
    hero_subtitle_en: Optional[str] = Field(None, max_length=500)


class PaymentInfoUpdate(BaseModel):
    mobile_money_holder: Optional[str] = Field(None, max_length=255)
    mvola_number: Optional[str] = Field(None, max_length=255)
    orange_money_number: Optional[str] = Field(None, max_length=255)
    airtel_money_number: Optional[str] = Field(None, max_length=255)
