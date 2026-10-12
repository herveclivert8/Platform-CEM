"""
Modèle MembershipPayment
Paiements des membres : frais d'inscription (une fois) puis cotisation mensuelle. Trois modes :

- CARD : payé en ligne via le prestataire de carte (app/services/payments.py), donc CONFIRMED aussitôt ;
- MOBILE_MONEY : payé hors du site puis déclaré (numéro émetteur + référence SMS), toujours en ariary ;
- CASH : espèces remises à l'antenne ; le membre annonce son paiement.

Les paiements MOBILE_MONEY et CASH restent PENDING jusqu'à ce qu'un admin (de l'antenne ou le
Super Admin) les confirme. Chaque cotisation confirmée prolonge l'accès d'un mois (User.paid_until).
"""

import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class MembershipPaymentKind(str, enum.Enum):
    REGISTRATION = "REGISTRATION"  # Frais d'inscription, une seule fois
    MONTHLY = "MONTHLY"  # Cotisation : un mois d'accès


class MembershipPaymentMethod(str, enum.Enum):
    CARD = "CARD"
    MOBILE_MONEY = "MOBILE_MONEY"
    CASH = "CASH"


class MembershipPaymentStatus(str, enum.Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"


# Montants SIMULÉS, fixés par le serveur (le membre ne choisit que la devise).
MEMBERSHIP_FEES: dict[MembershipPaymentKind, dict[str, int]] = {
    MembershipPaymentKind.REGISTRATION: {"MGA": 50_000, "EUR": 10, "USD": 12},
    MembershipPaymentKind.MONTHLY: {"MGA": 10_000, "EUR": 2, "USD": 3},
}


def _enum(e: type[enum.Enum], name: str) -> Enum:
    return Enum(e, name=name, values_callable=lambda members: [m.value for m in members])


class MembershipPayment(Base):
    __tablename__ = "membership_payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Antenne du membre au moment du paiement : détermine quel admin peut le confirmer
    branch_id: Mapped[int | None] = mapped_column(
        ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True
    )

    kind: Mapped[MembershipPaymentKind] = mapped_column(
        _enum(MembershipPaymentKind, "membership_payment_kind"), nullable=False
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), nullable=False)
    payment_method: Mapped[MembershipPaymentMethod] = mapped_column(
        _enum(MembershipPaymentMethod, "membership_payment_method"), nullable=False
    )
    mobile_operator: Mapped[str | None] = mapped_column(String(20), nullable=True)
    sender_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    # Mobile Money : référence reçue par SMS ; carte : id du paiement chez le prestataire
    transaction_reference: Mapped[str | None] = mapped_column(String(64), nullable=True)

    status: Mapped[MembershipPaymentStatus] = mapped_column(
        _enum(MembershipPaymentStatus, "membership_payment_status"),
        default=MembershipPaymentStatus.PENDING,
        nullable=False,
        index=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Cotisation confirmée : mois d'accès couvert
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(foreign_keys=[user_id])
    branch: Mapped["Branch | None"] = relationship()
