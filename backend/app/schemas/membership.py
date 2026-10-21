"""
Schémas Pydantic pour l'adhésion des membres : frais, paiements, validation et projets proposés.
"""

from datetime import date, datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.schemas.donation import MobileOperator, normalize_mg_phone, normalize_transaction_reference
from app.schemas.post import Pillar


class MembershipCurrency(str, Enum):
    MGA = "MGA"
    EUR = "EUR"
    USD = "USD"


class MembershipPaymentKind(str, Enum):
    REGISTRATION = "REGISTRATION"
    MONTHLY = "MONTHLY"


class MembershipStatus(str, Enum):
    PENDING = "PENDING"
    ACTIVE = "ACTIVE"
    REJECTED = "REJECTED"
    SUSPENDED = "SUSPENDED"


class MembershipPaymentStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"


class MembershipFees(BaseModel):
    """Montants par type de paiement puis par devise : {"REGISTRATION": {"MGA": 50000, ...}, ...}"""
    registration: dict[str, int]
    monthly: dict[str, int]
    simulated: bool = True


class CardMembershipPayment(BaseModel):
    kind: MembershipPaymentKind
    currency: MembershipCurrency
    # Jeton produit par le navigateur : le numéro de carte n'est jamais envoyé au serveur
    payment_token: str = Field(..., min_length=1, max_length=255)


class MobileMoneyMembershipPayment(BaseModel):
    """Paiement Mobile Money déjà effectué (toujours en ariary)."""
    kind: MembershipPaymentKind
    operator: MobileOperator
    sender_phone: str
    transaction_reference: str

    @field_validator("sender_phone")
    @classmethod
    def validate_sender_phone(cls, v: str) -> str:
        return normalize_mg_phone(v)

    @field_validator("transaction_reference")
    @classmethod
    def validate_transaction_reference(cls, v: str) -> str:
        return normalize_transaction_reference(v)


class CashMembershipPayment(BaseModel):
    """Espèces remises à l'antenne : à confirmer par un admin à la réception."""
    kind: MembershipPaymentKind
    currency: MembershipCurrency


class AdminCashPayment(BaseModel):
    """Espèces reçues au guichet de l'antenne, enregistrées (et confirmées d'office) par un admin."""
    kind: MembershipPaymentKind
    currency: MembershipCurrency


class MembershipPayment(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    user_id: int
    branch_id: Optional[int] = None
    kind: MembershipPaymentKind
    amount: float
    currency: str
    payment_method: str
    mobile_operator: Optional[str] = None
    sender_phone: Optional[str] = None
    transaction_reference: Optional[str] = None
    status: MembershipPaymentStatus
    rejection_reason: Optional[str] = None
    period_start: Optional[date] = None
    period_end: Optional[date] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime


class MembershipPaymentAdmin(MembershipPayment):
    member_name: str
    member_email: str
    branch_name: Optional[str] = None


class MembershipPaymentListResponse(BaseModel):
    items: list[MembershipPaymentAdmin]
    total: int
    page: int
    page_size: int
    total_pages: int


class MembershipSummary(BaseModel):
    """État de l'adhésion du membre connecté."""
    membership_status: MembershipStatus
    paid_until: Optional[date] = None
    # Adhésion validée et cotisation du mois payée
    has_access: bool
    registration_paid: bool
    registration_pending: bool
    monthly_pending: bool
    payments: list[MembershipPayment]
    # Carte de membre
    member_number: int
    member_since: datetime


class MemberAdmin(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    phone: Optional[str] = None
    branch_id: Optional[int] = None
    branch_name: Optional[str] = None
    membership_status: MembershipStatus
    paid_until: Optional[date] = None
    has_access: bool
    registration_paid: bool
    pending_payments: int
    created_at: datetime


class MemberListResponse(BaseModel):
    items: list[MemberAdmin]
    total: int
    page: int
    page_size: int
    total_pages: int


class RejectReason(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class MemberProjectCreate(BaseModel):
    """Projet proposé par un membre : publié sur le site une fois validé par le Super Admin."""
    title: str = Field(..., min_length=1, max_length=255)
    summary: str = Field(..., min_length=1, max_length=500)
    description: str = Field(..., min_length=1, max_length=20_000)
    pillar: Pillar
    beneficiaries: str = Field(..., min_length=1, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    # Photo facultative, envoyée au préalable par le membre (POST /upload/image)
    image: Optional[str] = Field(None, max_length=512)
    # Documents facultatifs, envoyés au préalable (POST /project-documents)
    document_ids: list[int] = Field(default_factory=list, max_length=3)


class AccountDeletion(BaseModel):
    """Suppression de son compte : mot de passe exigé (une session restée ouverte ne suffit pas)."""
    password: str = Field(..., min_length=1, max_length=200)


class MemberProfileUpdate(BaseModel):
    """Le membre modifie son nom et son téléphone (l'email et l'antenne restent fixes)."""
    first_name: str = Field(..., min_length=1, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)
    phone: Optional[str] = Field(None, max_length=30)

    @field_validator("first_name", "last_name")
    @classmethod
    def strip_required(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Champ obligatoire")
        return v

    @field_validator("phone")
    @classmethod
    def blank_phone_is_none(cls, v: Optional[str]) -> Optional[str]:
        return (v or "").strip() or None


class MyDiscussion(BaseModel):
    """Projet sur lequel le membre a commenté."""
    project_id: int
    title: str
    phase: str
    branch_name: str
    my_comments: int
    total_comments: int
    last_activity_at: datetime


class AvatarUpdate(BaseModel):
    avatar_url: Optional[str] = Field(None, max_length=512)
