"""
Modèle ContentTranslation
Traduction automatique (FR → EN) d'un champ de contenu saisi par un admin : un post, un projet,
les textes de la page d'accueil... Les admins ne saisissent que le français ; ces lignes sont un
cache généré par app.services.translation, jamais édité à la main.

`source_hash` est l'empreinte du texte français traduit : si le français change, la traduction ne
correspond plus et n'est plus affichée (le français l'est à la place) jusqu'à sa régénération.
"""

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ContentTranslation(Base):
    __tablename__ = "content_translations"
    __table_args__ = (
        UniqueConstraint("resource_type", "resource_id", "field", "lang", name="uq_content_translation"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "post", "project", "home"
    resource_id: Mapped[int] = mapped_column(Integer, nullable=False)
    field: Mapped[str] = mapped_column(String(100), nullable=False)
    lang: Mapped[str] = mapped_column(String(8), nullable=False)
    source_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
