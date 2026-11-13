import re
from datetime import datetime
from enum import Enum
from typing import Literal, Optional

from pydantic import ConfigDict, BaseModel, EmailStr, Field, field_validator, model_validator


class PaymentMethod(str, Enum):
    CARD = "CARD"
    MOBILE_MONEY = "MOBILE_MONEY"
    BANK_TRANSFER = "BANK_TRANSFER"  # Virement reçu, enregistré par un admin
    CASH = "CASH"  # Espèces, enregistrées par un admin
    IN_KIND = "IN_KIND"  # Don matériel, enregistré par un admin


class DonationStatus(str, Enum):
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    REJECTED = "REJECTED"


class MobileOperator(str, Enum):
    MVOLA = "MVOLA"
    ORANGE_MONEY = "ORANGE_MONEY"
    AIRTEL_MONEY = "AIRTEL_MONEY"


MG_MOBILE_RE = re.compile(r"^03[2-9]\d{7}$")
TRANSACTION_REFERENCE_RE = re.compile(r"^[A-Z0-9][A-Z0-9.\-_/]{3,63}$")


def normalize_mg_phone(value: str) -> str:
    """'+261 34 12 345 67', '034.12.345.67'... -> '0341234567' (numéro mobile malgache)."""
    digits = re.sub(r"[\s.\-()]", "", value)
    if digits.startswith("+261"):
        digits = "0" + digits[4:]
    elif digits.startswith("261") and len(digits) == 12:
        digits = "0" + digits[3:]
    if not MG_MOBILE_RE.match(digits):
        raise ValueError("Numéro de téléphone invalide (format attendu : 034 12 345 67)")
    return digits


def normalize_transaction_reference(value: str) -> str:
    reference = re.sub(r"\s", "", value).upper()
    if not TRANSACTION_REFERENCE_RE.match(reference):
        raise ValueError("Référence de transaction invalide")
    return reference


class _MobileMoneyPayment(BaseModel):
    operator: MobileOperator
    sender_phone: str
    transaction_reference: str
    # En ariary
    amount: float = Field(..., ge=100, le=1_000_000_000)
    donor_name: Optional[str] = Field(None, max_length=255)

    @field_validator("sender_phone")
    @classmethod
    def validate_sender_phone(cls, v: str) -> str:
        return normalize_mg_phone(v)

    @field_validator("transaction_reference")
    @classmethod
    def validate_transaction_reference(cls, v: str) -> str:
        return normalize_transaction_reference(v)


class MobileMoneyDeclaration(_MobileMoneyPayment):
    """Déclaration par le donateur d'un paiement Mobile Money déjà effectué."""
    branch_id: Optional[int] = None
    donor_email: EmailStr
    # Champ piège anti-robots : invisible pour un humain, donc toujours vide pour un vrai donateur
    website: Optional[str] = Field(None, max_length=255)


class ManualDonationCreate(BaseModel):
    """
    Don reçu, enregistré par un admin (confirmé d'office) :
    - MOBILE_MONEY : paiement reçu sans déclaration du donateur (opérateur, numéro, référence, montant en ariary) ;
    - CASH : espèces remises en main propre (montant et devise) ;
    - BANK_TRANSFER : virement reçu sur le compte bancaire (montant, devise, référence facultative) ;
    - IN_KIND : don matériel (description de ce qui a été reçu, sans montant).
    """
    kind: Literal["MOBILE_MONEY", "CASH", "BANK_TRANSFER", "IN_KIND"] = "MOBILE_MONEY"
    branch_id: Optional[int] = None
    donor_email: Optional[EmailStr] = None
    donor_name: Optional[str] = Field(None, max_length=255)
    # Mobile Money
    operator: Optional[MobileOperator] = None
    sender_phone: Optional[str] = None
    transaction_reference: Optional[str] = None
    # Mobile Money (ariary), espèces et virement
    amount: Optional[float] = Field(None, gt=0, le=1_000_000_000)
    currency: Optional["CardCurrency"] = None
    # Don matériel
    description: Optional[str] = Field(None, max_length=2000)

    @model_validator(mode="after")
    def check_kind_fields(self) -> "ManualDonationCreate":
        if self.kind == "MOBILE_MONEY":
            if not (self.operator and self.sender_phone and self.transaction_reference and self.amount):
                raise ValueError("Opérateur, numéro, référence et montant sont requis")
            if self.amount < 100:
                raise ValueError("Montant minimum : 100 Ar")
            self.sender_phone = normalize_mg_phone(self.sender_phone)
            self.transaction_reference = normalize_transaction_reference(self.transaction_reference)
        elif self.kind in ("CASH", "BANK_TRANSFER"):
            if not self.amount:
                raise ValueError("Le montant reçu est requis")
            if self.kind == "BANK_TRANSFER":
                # Référence du virement (libre, facultative) : sert à le retrouver sur le relevé
                self.transaction_reference = (self.transaction_reference or "").strip()[:64] or None
            else:
                self.transaction_reference = None
        else:
            self.description = (self.description or "").strip()
            if not self.description:
                raise ValueError("Décrivez le matériel reçu")
        return self


class CardCurrency(str, Enum):
    MGA = "MGA"
    EUR = "EUR"
    USD = "USD"


# Montants minimum et maximum d'un don par carte, par devise
CARD_CURRENCY_LIMITS: dict[CardCurrency, tuple[float, float]] = {
    CardCurrency.MGA: (5_000, 500_000_000),
    CardCurrency.EUR: (1, 100_000),
    CardCurrency.USD: (1, 100_000),
}


class CardDonationCreate(BaseModel):
    branch_id: Optional[int] = None
    # EUR par défaut, pour les clients qui n'envoient pas encore de devise
    currency: CardCurrency = CardCurrency.EUR
    amount: float = Field(..., gt=0)
    donor_email: EmailStr
    donor_name: Optional[str] = Field(None, max_length=255)
    # Jeton produit par le navigateur : le numéro de carte n'est jamais envoyé au serveur
    payment_token: str = Field(..., min_length=1, max_length=255)

    @model_validator(mode="after")
    def check_amount_for_currency(self) -> "CardDonationCreate":
        minimum, maximum = CARD_CURRENCY_LIMITS[self.currency]
        if not minimum <= self.amount <= maximum:
            bounds = " et ".join(f"{v:,.0f}".replace(",", " ") for v in (minimum, maximum))
            raise ValueError(f"Montant hors limites pour {self.currency.value} : entre {bounds}")
        if self.currency == CardCurrency.MGA and self.amount != int(self.amount):
            raise ValueError("Un montant en ariary doit être un nombre entier")
        return self


class DonationConfirm(BaseModel):
    """Corrections éventuelles avant validation (montant réellement reçu, référence mal saisie)."""
    amount: Optional[float] = Field(None, gt=0, le=1_000_000_000)
    transaction_reference: Optional[str] = None

    @field_validator("transaction_reference")
    @classmethod
    def validate_transaction_reference(cls, v: Optional[str]) -> Optional[str]:
        return normalize_transaction_reference(v) if v else None


class DonationReject(BaseModel):
    reason: str = Field(..., min_length=3, max_length=500)


class DonationPublic(BaseModel):
    """Réponse renvoyée au donateur (pas de données de vérification)."""
    id: int
    amount: float
    currency: str
    payment_method: PaymentMethod
    status: DonationStatus
    donor_name: Optional[str] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Donation(BaseModel):
    """Vue admin complète d'un don."""
    id: int
    branch_id: Optional[int] = None
    amount: float
    declared_amount: Optional[float] = None
    currency: str
    donor_name: Optional[str] = None
    donor_email: Optional[str] = None
    donor_phone: Optional[str] = None
    payment_method: PaymentMethod
    mobile_operator: Optional[MobileOperator] = None
    transaction_reference: Optional[str] = None
    in_kind_description: Optional[str] = None
    status: DonationStatus
    rejection_reason: Optional[str] = None
    status_updated_at: Optional[datetime] = None
    thank_you_email_sent_at: Optional[datetime] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DonationListResponse(BaseModel):
    items: list[Donation]
    total: int
    page: int
    page_size: int
    total_pages: int


class MobileMoneyAccount(BaseModel):
    operator: MobileOperator
    label: str
    number: str


class CardOption(BaseModel):
    enabled: bool
    # True tant qu'aucun vrai prestataire n'est branché : aucun paiement réel
    simulated: bool


class MobileMoneyOption(BaseModel):
    holder: Optional[str] = None
    accounts: list[MobileMoneyAccount]


class BankTransferOption(BaseModel):
    """Compte bancaire (RIB) pour un virement ; l'admin enregistre ensuite le virement reçu."""
    holder: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    iban: Optional[str] = None
    swift: Optional[str] = None


class PaymentOptions(BaseModel):
    """Modes de paiement proposés aux donateurs et aux membres (public)."""
    card: CardOption
    mobile_money: MobileMoneyOption
    # None : aucun compte bancaire renseigné, le virement n'est pas proposé
    bank_transfer: Optional[BankTransferOption] = None
