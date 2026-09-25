"""
Modèle Donation
Don, éventuellement fléché vers une antenne. Deux modes de paiement :

- CARD : payé en ligne via le prestataire de carte (app/services/payments.py) ; le don n'est
  créé qu'une fois le paiement accepté, donc directement CONFIRMED.
- MOBILE_MONEY : payé hors du site (MVola, Orange Money, Airtel Money). Le donateur déclare
  son paiement (numéro émetteur + référence reçue par SMS) ; le don est PENDING jusqu'à ce qu'un
  admin retrouve la transaction dans l'historique du compte et le confirme (ou le rejette).

BANK_TRANSFER n'est plus proposé ; la valeur reste pour les anciens dons.
"""

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class DonationStatus(str, enum.Enum):
    PENDING = "PENDING"  # "À vérifier"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"


class PaymentMethod(str, enum.Enum):
    CARD = "CARD"
    MOBILE_MONEY = "MOBILE_MONEY"
    BANK_TRANSFER = "BANK_TRANSFER"  # Ancien mode, plus proposé


class MobileOperator(str, enum.Enum):
    MVOLA = "MVOLA"
    ORANGE_MONEY = "ORANGE_MONEY"
    AIRTEL_MONEY = "AIRTEL_MONEY"


MOBILE_OPERATOR_LABELS = {
    MobileOperator.MVOLA: "MVola",
    MobileOperator.ORANGE_MONEY: "Orange Money",
    MobileOperator.AIRTEL_MONEY: "Airtel Money",
}

# Devise imposée par le mode de paiement : carte en euros, Mobile Money en ariary.
CURRENCY_BY_METHOD = {
    PaymentMethod.CARD: "EUR",
    PaymentMethod.MOBILE_MONEY: "MGA",
    PaymentMethod.BANK_TRANSFER: "EUR",
}


class Donation(Base):
    __tablename__ = "donations"

    id: Mapped[int] = mapped_column(primary_key=True)
    branch_id: Mapped[int | None] = mapped_column(
        ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True
    )
    amount: Mapped[float] = mapped_column(Numeric(12, 2), nullable=False)
    # Montant annoncé par le donateur, conservé si l'admin corrige `amount` au montant réellement reçu
    declared_amount: Mapped[float | None] = mapped_column(Numeric(12, 2), nullable=True)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="EUR")

    donor_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Peut manquer pour un don enregistré à la main par un admin
    donor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    # Mobile Money : numéro qui a envoyé l'argent (normalisé, ex: 0341234567)
    donor_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)

    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(PaymentMethod, name="payment_method", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    mobile_operator: Mapped[str | None] = mapped_column(String(20), nullable=True)
    # Mobile Money : référence reçue par SMS (unique par opérateur) ; carte : id du paiement chez le prestataire
    transaction_reference: Mapped[str | None] = mapped_column(String(64), nullable=True)

    status: Mapped[DonationStatus] = mapped_column(
        Enum(DonationStatus, name="donation_status", values_callable=lambda e: [m.value for m in e]),
        default=DonationStatus.PENDING,
        nullable=False,
        index=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    thank_you_email_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    branch: Mapped["Branch | None"] = relationship()
