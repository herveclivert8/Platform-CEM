"""
Modèle AssociationSettings
Réglages globaux de l'association (pas liés à une antenne). Ligne unique (id=1).
"""

from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
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

    # Couverture de la page d'accueil. NULL = texte / photo par défaut du site.
    hero_image_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    hero_badge_fr: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hero_badge_en: Mapped[str | None] = mapped_column(String(255), nullable=True)
    hero_title_fr: Mapped[str | None] = mapped_column(Text, nullable=True)
    hero_title_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    hero_subtitle_fr: Mapped[str | None] = mapped_column(Text, nullable=True)
    hero_subtitle_en: Mapped[str | None] = mapped_column(Text, nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
