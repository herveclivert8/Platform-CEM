"""
Schémas Pydantic pour les réglages globaux de l'association
"""

from typing import Optional

from pydantic import ConfigDict, BaseModel, EmailStr, Field, field_validator


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


class HomePageRead(BaseModel):
    """
    Contenus personnalisables de la page d'accueil et du pied de page. En anglais (?lang=en), les
    textes sont leur traduction automatique à jour, ou le français tant qu'elle n'est pas prête.
    Un champ à null = contenu par défaut du site.
    """
    hero_image_url: Optional[str] = None
    hero_badge: Optional[str] = None
    hero_title: Optional[str] = None
    hero_subtitle: Optional[str] = None
    values: Optional[list[str]] = None
    contact_address: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    map_subtitle: Optional[str] = None
    show_donation_totals: bool = False
    lang: str = "fr"


class HomePageUpdate(BaseModel):
    """Saisie en français uniquement. Un champ vidé revient au contenu par défaut du site."""
    hero_image_url: Optional[str] = Field(None, max_length=512)
    hero_badge: Optional[str] = Field(None, max_length=255)
    hero_title: Optional[str] = Field(None, max_length=200)
    hero_subtitle: Optional[str] = Field(None, max_length=500)
    values: Optional[list[str]] = Field(None, max_length=12)
    contact_address: Optional[str] = Field(None, max_length=512)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, max_length=50)
    map_subtitle: Optional[str] = Field(None, max_length=300)
    show_donation_totals: Optional[bool] = None

    @field_validator("values")
    @classmethod
    def clean_values(cls, values: Optional[list[str]]) -> Optional[list[str]]:
        if values is None:
            return None
        cleaned = [v.strip() for v in values if v and v.strip()]
        if any(len(v) > 120 for v in cleaned):
            raise ValueError("Chaque valeur fait au plus 120 caractères")
        return cleaned or None

    @field_validator("contact_email", mode="before")
    @classmethod
    def empty_email_is_none(cls, value):
        return value or None
