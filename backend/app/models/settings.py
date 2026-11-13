"""
Modèle AssociationSettings
Réglages globaux de l'association (pas liés à une antenne). Ligne unique (id=1).
"""

from datetime import datetime

from sqlalchemy import JSON, Boolean, DateTime, String, Text, false, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AssociationSettings(Base):
    __tablename__ = "association_settings"

    id: Mapped[int] = mapped_column(primary_key=True)

    facebook_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    x_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    youtube_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Comptes Mobile Money (en Ar) affichés aux donateurs. Un opérateur sans numéro n'est pas proposé.
    mobile_money_holder: Mapped[str | None] = mapped_column(String(255), nullable=True)
    mvola_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    orange_money_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    airtel_money_number: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Compte bancaire (RIB) affiché aux donateurs et aux membres pour un virement. Sans numéro de
    # compte ni IBAN, le virement n'est pas proposé. Le virement reçu est enregistré par un admin.
    bank_account_holder: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bank_account_number: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bank_iban: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bank_swift: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Couverture de la page d'accueil. NULL = texte / photo par défaut du site.
    hero_image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    hero_badge_fr: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hero_badge_en: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hero_title_fr: Mapped[str | None] = mapped_column(Text, nullable=True)
    hero_title_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    hero_subtitle_fr: Mapped[str | None] = mapped_column(Text, nullable=True)
    hero_subtitle_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Les colonnes hero_*_en ne sont plus saisies : l'anglais est traduit automatiquement depuis le
    # français (app.services.translation). Elles restent pour l'ancien endpoint /settings/home-hero.

    # Pied de page : « Nos valeurs » (liste ordonnée, en français) et coordonnées de contact.
    # NULL = contenu par défaut du site (les 4 piliers, l'adresse et l'e-mail du siège).
    home_values: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    # Commentaire de chaque valeur (même ordre, "" = aucun), affiché au survol dans le pied de page
    home_value_descriptions: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)

    # « Ils nous font confiance » : [{"group": "agreement" | "tacit" | "developing", "name": ..., "url": ...}]
    # en français, dans l'ordre d'affichage. NULL = partenaires par défaut du site.
    institutional_partners: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)

    # Mots gardés tels quels par la traduction automatique, dans tous les contenus du site
    # (noms propres, sigles, lieux...). NULL = aucun.
    untranslated_terms: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    contact_address: Mapped[str | None] = mapped_column(String(512), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Phrase sous « Nos antennes » (carte). NULL = phrase calculée par le site (antennes, pays).
    map_subtitle: Mapped[str | None] = mapped_column(String(300), nullable=True)

    # Page « Qui sommes-nous » : textes modifiés par le Super Admin, en français, indexés par la clé
    # de traduction du site qu'ils remplacent ({"about.intro": "...", ...}). Clé absente = texte par défaut.
    about_content: Mapped[dict[str, str] | None] = mapped_column(JSON, nullable=True)

    # Page « Transparence » : publier les totaux des dons confirmés (désactivé par défaut)
    show_donation_totals: Mapped[bool] = mapped_column(Boolean, default=False, server_default=false(), nullable=False)

    # Logo de l'association (images envoyées par le Super Admin). NULL = logo livré avec le site.
    # logo_url : logo complet (en-tête, pied de page) ; logo_mark_url : emblème carré (icône de
    # l'onglet, menu de l'admin, cartes de membre et badges).
    logo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    logo_mark_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
