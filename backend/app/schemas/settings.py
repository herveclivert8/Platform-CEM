"""
Schémas Pydantic pour les réglages globaux de l'association
"""

from typing import Literal, Optional

from pydantic import ConfigDict, BaseModel, EmailStr, Field, field_validator, model_validator


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


class PartnerItem(BaseModel):
    """Partenaire institutionnel de « Ils nous font confiance » (page d'accueil)."""
    group: Literal["agreement", "tacit", "developing"]  # conventionné, tacite, en cours de développement
    name: str = Field(..., max_length=200)
    url: Optional[str] = Field(None, max_length=300)
    # Nom propre : affiché tel quel en anglais, sans traduction automatique
    keep_name: bool = False

    @field_validator("url")
    @classmethod
    def clean_url(cls, url: Optional[str]) -> Optional[str]:
        url = (url or "").strip()
        if not url:
            return None
        if not url.startswith(("http://", "https://")):
            url = f"https://{url}"  # « www.exemple.mg » saisi sans protocole
        if " " in url or "." not in url:
            raise ValueError("Adresse de site web invalide")
        return url


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
    # Commentaire de chaque valeur, dans le même ordre ("" = aucun)
    value_descriptions: Optional[list[str]] = None
    partners: Optional[list[PartnerItem]] = None
    # Mots que la traduction automatique garde tels quels, dans tout le site
    untranslated_terms: Optional[list[str]] = None
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
    value_descriptions: Optional[list[str]] = Field(None, max_length=12)
    partners: Optional[list[PartnerItem]] = Field(None, max_length=40)
    untranslated_terms: Optional[list[str]] = Field(None, max_length=200)
    contact_address: Optional[str] = Field(None, max_length=512)
    contact_email: Optional[EmailStr] = None
    contact_phone: Optional[str] = Field(None, max_length=50)
    map_subtitle: Optional[str] = Field(None, max_length=300)
    show_donation_totals: Optional[bool] = None

    @model_validator(mode="after")
    def clean_values(self) -> "HomePageUpdate":
        """Retirer les valeurs vides avec leur commentaire, pour garder les deux listes alignées."""
        if "values" not in self.model_fields_set:
            return self
        descriptions = self.value_descriptions or []
        pairs = [
            (value.strip(), (descriptions[i] if i < len(descriptions) else "").strip())
            for i, value in enumerate(self.values or [])
            if value and value.strip()
        ]
        if any(len(value) > 120 for value, _ in pairs):
            raise ValueError("Chaque valeur fait au plus 120 caractères")
        if any(len(text) > 300 for _, text in pairs):
            raise ValueError("Chaque commentaire fait au plus 300 caractères")
        self.values = [value for value, _ in pairs] or None
        self.value_descriptions = [text for _, text in pairs] if pairs and any(text for _, text in pairs) else None
        self.model_fields_set.add("value_descriptions")
        return self

    @field_validator("partners")
    @classmethod
    def clean_partners(cls, partners: Optional[list[PartnerItem]]) -> Optional[list[PartnerItem]]:
        """Retirer les partenaires sans nom ; liste vide = partenaires par défaut du site."""
        if partners is None:
            return None
        cleaned = [p.model_copy(update={"name": p.name.strip()}) for p in partners if p.name.strip()]
        return cleaned or None

    @field_validator("untranslated_terms")
    @classmethod
    def clean_terms(cls, terms: Optional[list[str]]) -> Optional[list[str]]:
        """Sans doublon (casse comprise) ni mot vide ; liste vide = aucun."""
        if terms is None:
            return None
        cleaned: dict[str, str] = {}
        for term in terms:
            term = " ".join((term or "").split())
            if term:
                cleaned.setdefault(term.casefold(), term)
        if any(len(term) > 100 for term in cleaned.values()):
            raise ValueError("Chaque mot à ne pas traduire fait au plus 100 caractères")
        return list(cleaned.values()) or None

    @field_validator("contact_email", mode="before")
    @classmethod
    def empty_email_is_none(cls, value):
        return value or None


# Textes modifiables de « Qui sommes-nous » : clés de traduction du site (frontend/src/i18n/fr.json)
_ABOUT_DOMAINS = ("education", "enterprise", "research", "solidarity", "sustainability")
_MEMBERSHIP_TYPES = ("ACTIVE", "BENEFACTOR", "SPONSOR")
ABOUT_FIELDS: tuple[str, ...] = (
    "about.headline_before",
    "about.headline_accent",
    "about.headline_after",
    "about.intro",
    "about.intro_2",
    # Les valeurs elles-mêmes sont celles du pied de page (HomePageUpdate.values)
    "about.values_title",
    "about.pillars_title",
    "about.pillars_text",
    # Domaines d'action : titre et détails (un point par ligne)
    *(f"about.domains.{d}.{part}" for d in _ABOUT_DOMAINS for part in ("title", "details")),
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
