"""
Modèle NewsletterSubscriber
Abonnés à la lettre d'information. Double confirmation (RGPD) : l'inscription reste PENDING tant
que le lien reçu par e-mail n'a pas été ouvert. Les jetons (confirmation, désinscription) ne sont
stockés que sous forme d'empreinte SHA-256, comme ceux de réinitialisation de mot de passe.
Les envois se font depuis un outil spécialisé (Brevo, Mailjet...) à partir de l'export CSV.
"""

from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

STATUS_PENDING = "PENDING"
STATUS_CONFIRMED = "CONFIRMED"
STATUS_UNSUBSCRIBED = "UNSUBSCRIBED"


class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    lang: Mapped[str] = mapped_column(String(8), nullable=False, default="fr")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=STATUS_PENDING, index=True)

    confirm_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    confirm_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    unsubscribe_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    unsubscribed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
