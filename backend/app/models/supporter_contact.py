"""
Modèle SupporterContact
Coordonnées laissées par les futurs membres bienfaiteurs et parrains/marraines, qui ne créent pas
eux-mêmes de compte : l'association les recontacte, puis le Super Admin accepte leur adhésion, ce
qui leur crée un compte (accès en lecture aux contenus réservés aux membres). Beaucoup souhaitent
rester anonymes : ces fiches ne sont visibles que du Super Admin (jamais dans l'annuaire).
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base

KIND_BENEFACTOR = "BENEFACTOR"
KIND_SPONSOR = "SPONSOR"

STATUS_NEW = "NEW"
STATUS_CONTACTED = "CONTACTED"
STATUS_ACCEPTED = "ACCEPTED"  # adhésion acceptée : compte créé (user_id)


class SupporterContact(Base):
    __tablename__ = "supporter_contacts"

    id: Mapped[int] = mapped_column(primary_key=True)
    kind: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(50), nullable=True)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    lang: Mapped[str] = mapped_column(String(8), nullable=False, default="fr")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default=STATUS_NEW, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    contacted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    accepted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
