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
    # Logo complet et emblème carré ; null = logo livré avec le site
    logo_url: Optional[str] = None
    logo_mark_url: Optional[str] = None
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
    logo_url: Optional[str] = Field(None, max_length=512)
    logo_mark_url: Optional[str] = Field(None, max_length=512)
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


# Textes modifiables de « Qui sommes-nous » : clés de traduction du site (frontend/src/i18n/fr.json)
_ABOUT_VALUES = ("excellence", "equality", "independence", "transparency")
_ABOUT_PILLARS = ("EDUCATION", "SOCIAL", "SPORT", "ENTERPRISE")
_MEMBERSHIP_TYPES = ("ACTIVE", "BENEFACTOR", "SPONSOR")
ABOUT_FIELDS: tuple[str, ...] = (
    "about.headline_before",
    "about.headline_accent",
    "about.headline_after",
    "about.intro",
    "about.intro_2",
    "about.values_title",
    *(f"about.values.{v}.{part}" for v in _ABOUT_VALUES for part in ("title", "text")),
    "about.pillars_title",
    "about.pillars_text",
    *(f"about.pillars.{p}" for p in _ABOUT_PILLARS),
    "about.network_title",
    "about.network_text",
    "about.partner_title",
    "about.partner_text",
    *(f"about.partner_goals.{g}" for g in ("skills", "resources", "excellence")),
    "about.partner_example",
    "about.membership.title",
    "about.membership.text",
    *(f"membership_types.{m}.{part}" for m in _MEMBERSHIP_TYPES for part in ("summary", "text")),
)
ABOUT_TEXT_MAX_LENGTH = 3000


class AboutPageRead(BaseModel):
    """
    Textes personnalisés de « Qui sommes-nous », par clé de traduction. En anglais (?lang=en), leur
    traduction automatique à jour, ou le français tant qu'elle n'est pas prête. Clé absente = texte par défaut.
    """
    content: dict[str, str]
    lang: str = "fr"


class AboutPageUpdate(BaseModel):
    """Saisie en français uniquement. Un texte vidé (ou absent) revient au contenu par défaut du site."""
    content: dict[str, Optional[str]]

    @field_validator("content")
    @classmethod
    def clean_content(cls, content: dict[str, Optional[str]]) -> dict[str, Optional[str]]:
        unknown = sorted(set(content) - set(ABOUT_FIELDS))
        if unknown:
            raise ValueError(f"Textes inconnus : {', '.join(unknown)}")
        cleaned = {key: value.strip() for key, value in content.items() if value and value.strip()}
        if any(len(v) > ABOUT_TEXT_MAX_LENGTH for v in cleaned.values()):
            raise ValueError(f"Chaque texte fait au plus {ABOUT_TEXT_MAX_LENGTH} caractères")
        return cleaned
