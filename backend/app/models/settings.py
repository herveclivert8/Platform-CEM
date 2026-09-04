"""
Modèle AssociationSettings
Réglages globaux de l'association (pas liés à une antenne). Ligne unique (id=1).
"""

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AssociationSettings(Base):
    __tablename__ = "association_settings"

    id: Mapped[int] = mapped_column(primary_key=True)

    facebook_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    x_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    linkedin_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    youtube_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
