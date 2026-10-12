"""
Modèle SocialPublication
Historique des publications automatiques sur les réseaux sociaux (une ligne par contenu et par
réseau) : un contenu n'est publié qu'une fois sur chaque réseau, même s'il est modifié ensuite.
"""

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, String, Text, UniqueConstraint, false, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

NETWORKS = ("FACEBOOK", "INSTAGRAM", "LINKEDIN")
# PUBLISHED : en ligne sur le réseau ; FAILED : erreur (réessayable) ; SKIPPED : non publiable
# (réseau non configuré, Instagram sans image...)
STATUSES = ("PUBLISHED", "FAILED", "SKIPPED")


class SocialPublication(Base):
    __tablename__ = "social_publications"
    __table_args__ = (UniqueConstraint("resource_type", "resource_id", "network", name="uq_social_publication"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    resource_type: Mapped[str] = mapped_column(String(20), nullable=False)  # "post" ou "project"
    resource_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    network: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    # Titre du contenu au moment de la publication (affiché dans l'historique, même s'il est supprimé)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    external_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Mode simulation : rien n'a réellement été envoyé
    simulated: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False, server_default=false())

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
