"""
Endpoints pour les dons.

Deux modes de paiement (voir app/models/donation.py) :
- carte bancaire : payée en ligne via le prestataire (app/services/payments.py), confirmée aussitôt ;
- Mobile Money : payé hors du site puis déclaré par le donateur (numéro émetteur + référence
  reçue par SMS) ; un admin retrouve la transaction dans l'historique du compte et valide ou rejette.

Un email de remerciement part à chaque confirmation (une seule fois par don).
"""

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_current_user, get_db
from app.api.scope import like_pattern, resolve_branch_scope
from app.core.email import email_service
from app.core.permissions import verify_branch_access, verify_super_admin_only
from app.core.rate_limit import rate_limit
from app.db.session import AsyncSessionLocal
from app.models import Branch, Donation, User
from app.models.branch import BranchStatus
from app.models.donation import (
    CURRENCY_BY_METHOD,
    MOBILE_OPERATOR_LABELS,
    DonationStatus as DonationStatusModel,
    MobileOperator as MobileOperatorModel,
    PaymentMethod as PaymentMethodModel,
)
from app.models.settings import AssociationSettings
from app.models.user import UserRole
from app.schemas.donation import (
    CardDonationCreate,
    CardOption,
    Donation as DonationSchema,
    DonationConfirm,
    DonationListResponse,
    DonationPublic,
    DonationReject,
    ManualDonationCreate,
    MobileMoneyAccount,
    MobileMoneyDeclaration,
    MobileMoneyOption,
    PaymentOptions,
)
from app.services.notification_service import get_branch_notification_recipients, send_batch_notification
from app.services.audit import record_audit
from app.services.payments import get_card_provider

router = APIRouter(prefix="/donations", tags=["donations"])

SETTINGS_ID = 1
OPERATOR_NUMBER_FIELDS = {
    MobileOperatorModel.MVOLA: "mvola_number",
    MobileOperatorModel.ORANGE_MONEY: "orange_money_number",
    MobileOperatorModel.AIRTEL_MONEY: "airtel_money_number",
}

# Anti-spam : déclarations Mobile Money "à vérifier" acceptées par numéro ou par email sur 24 h
MAX_PENDING_DECLARATIONS = 3
PENDING_DECLARATIONS_WINDOW = timedelta(hours=24)


# ============================================
# Helpers
# ============================================

CURRENCY_SYMBOLS = {"EUR": "€", "USD": "$"}


def format_amount(amount: float, currency: str) -> str:
    if currency == "MGA":
        return f"{amount:,.0f} Ar".replace(",", " ")
    symbol = CURRENCY_SYMBOLS.get(currency, currency)
    return f"{amount:,.2f} {symbol}".replace(",", " ").replace(".", ",")


def payment_label(donation: Donation) -> str:
    if donation.payment_method == PaymentMethodModel.CARD:
        return "Carte bancaire"
    if donation.payment_method == PaymentMethodModel.MOBILE_MONEY and donation.mobile_operator:
        return f"Mobile Money ({MOBILE_OPERATOR_LABELS[MobileOperatorModel(donation.mobile_operator)]})"
    return "Virement bancaire"


def _audit_donation(db: AsyncSession, user: User, action: str, donation: Donation, **extra) -> None:
    record_audit(
        db, user=user, action=action, resource_type="donation", resource_id=donation.id,
        branch_id=donation.branch_id,
        details={
            "amount": float(donation.amount),
            "currency": donation.currency,
            "reference": donation.transaction_reference,
            **extra,
        },
    )


def _mobile_money_accounts(settings: AssociationSettings | None) -> list[MobileMoneyAccount]:
    if settings is None:
        return []
    return [
        MobileMoneyAccount(operator=operator.value, label=MOBILE_OPERATOR_LABELS[operator], number=number)
        for operator, field in OPERATOR_NUMBER_FIELDS.items()
        if (number := getattr(settings, field))
    ]


async def _get_branch_or_404(db: AsyncSession, branch_id: int | None) -> Branch | None:
    if branch_id is None:
        return None
    branch = await db.get(Branch, branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Antenne introuvable")
    return branch


async def _get_open_branch_or_404(db: AsyncSession, branch_id: int | None) -> Branch | None:
    """Comme _get_branch_or_404, mais refuse les dons publics à une antenne qui n'est pas active."""
    branch = await _get_branch_or_404(db, branch_id)
    if branch and branch.status != BranchStatus.ACTIVE:
        raise HTTPException(status_code=409, detail="Cette antenne n'accepte pas de dons pour le moment.")
    return branch


async def _verify_can_manage(user: User, branch_id: int | None) -> None:
    """Admin de l'antenne du don, ou Super Admin (seul habilité pour les dons globaux)."""
    if branch_id is None:
        await verify_super_admin_only(user)
    else:
        await verify_branch_access(user, branch_id)


async def _ensure_reference_is_new(db: AsyncSession, operator: str, reference: str, exclude_id: int | None = None) -> None:
    query = select(Donation.id).where(
        Donation.mobile_operator == operator, Donation.transaction_reference == reference
    )
    if exclude_id is not None:
        query = query.where(Donation.id != exclude_id)
    if await db.scalar(query):
        raise HTTPException(status_code=409, detail="Cette référence de transaction a déjà été déclarée.")


async def _commit_or_conflict(db: AsyncSession) -> None:
    """Commit, en traduisant une référence en double (course entre deux requêtes) en 409."""
    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Cette référence de transaction a déjà été déclarée.")


async def _send_thank_you_email(donation_id: int) -> None:
    """Tâche de fond : email de remerciement, une seule fois par don confirmé."""
    async with AsyncSessionLocal() as db:
        donation = await db.get(Donation, donation_id)
        if (
            donation is None
            or donation.status != DonationStatusModel.CONFIRMED
            or not donation.donor_email
            or donation.thank_you_email_sent_at is not None
        ):
            return
        branch = await db.get(Branch, donation.branch_id) if donation.branch_id else None
        sent = await run_in_threadpool(
            email_service.send_donation_thank_you,
            donor_email=donation.donor_email,
            donor_name=donation.donor_name,
            amount_label=format_amount(float(donation.amount), donation.currency),
            payment_label=payment_label(donation),
            branch_name=branch.name if branch else None,
            donation_date=donation.created_at,
        )
        if sent:
            donation.thank_you_email_sent_at = datetime.now(timezone.utc)
            await db.commit()


async def _notify_admins(db: AsyncSession, donation: Donation, branch: Branch | None, title: str, suffix: str) -> None:
    recipient_ids = await get_branch_notification_recipients(db, donation.branch_id)
    branch_label = f" — {branch.name}" if branch else ""
    donor = donation.donor_name or donation.donor_email or "Donateur"
    await send_batch_notification(
        recipient_ids,
        title=title,
        message=f"{format_amount(float(donation.amount), donation.currency)} de {donor}{branch_label}. {suffix}".strip(),
        notification_type="info" if donation.status == DonationStatusModel.PENDING else "success",
        action_url="/admin/donations",
        icon="donation",
        db=db,
    )


# ============================================
# Public
# ============================================

@router.get("/payment-options", response_model=PaymentOptions)
async def get_payment_options(db: AsyncSession = Depends(get_db)):
    """Modes de paiement proposés aux donateurs. Accessible: Public."""
    settings = await db.get(AssociationSettings, SETTINGS_ID)
    provider = get_card_provider()
    return PaymentOptions(
        card=CardOption(enabled=provider is not None, simulated=bool(provider and provider.simulated)),
        mobile_money=MobileMoneyOption(
            holder=settings.mobile_money_holder if settings else None,
            accounts=_mobile_money_accounts(settings),
        ),
    )


@router.post(
    "/card",
    response_model=DonationPublic,
    status_code=201,
    # Limite aussi le test de cartes volées
    dependencies=[Depends(rate_limit("donation_card", limit=10, window=60 * 60))],
)
async def donate_by_card(
    data: CardDonationCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Payer un don par carte. Le don n'est enregistré que si le paiement est accepté. Accessible: Public."""
    provider = get_card_provider()
    if provider is None:
        raise HTTPException(status_code=400, detail="Le paiement par carte n'est pas disponible pour le moment.")
    branch = await _get_open_branch_or_404(db, data.branch_id)

    currency = data.currency.value
    result = await provider.charge(
        amount=data.amount,
        currency=currency,
        token=data.payment_token,
        description=f"Don CEM{f' — {branch.name}' if branch else ''} ({data.donor_email})",
    )
    if not result.success:
        # 402 Payment Required : refus du prestataire, message affichable au donateur
        raise HTTPException(status_code=402, detail=result.failure_message or "Paiement refusé.")

    now = datetime.now(timezone.utc)
    donation = Donation(
        branch_id=data.branch_id,
        amount=data.amount,
        currency=currency,
        donor_email=data.donor_email,
        donor_name=data.donor_name or None,
        payment_method=PaymentMethodModel.CARD,
        transaction_reference=result.payment_id,
        status=DonationStatusModel.CONFIRMED,
        status_updated_at=now,
    )
    db.add(donation)
    await db.commit()
    await db.refresh(donation)

    await _notify_admins(db, donation, branch, "Nouveau don par carte", "")
    background_tasks.add_task(_send_thank_you_email, donation.id)
    return DonationPublic.model_validate(donation)


@router.post(
    "/mobile-money",
    response_model=DonationPublic,
    status_code=201,
    dependencies=[Depends(rate_limit("donation_mobile_money", limit=10, window=60 * 60))],
)
async def declare_mobile_money_donation(
    data: MobileMoneyDeclaration,
    db: AsyncSession = Depends(get_db),
):
    """Déclarer un paiement Mobile Money déjà effectué (statut "à vérifier"). Accessible: Public."""
    if data.website:
        # Champ piège rempli : robot
        raise HTTPException(status_code=400, detail="Déclaration refusée.")

    branch = await _get_open_branch_or_404(db, data.branch_id)

    pending_count = await db.scalar(
        select(func.count(Donation.id)).where(
            Donation.status == DonationStatusModel.PENDING,
            Donation.created_at >= datetime.now(timezone.utc) - PENDING_DECLARATIONS_WINDOW,
            or_(Donation.donor_phone == data.sender_phone, Donation.donor_email == data.donor_email),
        )
    )
    if pending_count >= MAX_PENDING_DECLARATIONS:
        raise HTTPException(
            status_code=429,
            detail="Plusieurs de vos paiements sont déjà en cours de vérification. "
            "Merci d'attendre leur validation avant d'en déclarer un nouveau.",
        )

    settings = await db.get(AssociationSettings, SETTINGS_ID)
    operator = MobileOperatorModel(data.operator.value)
    if not settings or not getattr(settings, OPERATOR_NUMBER_FIELDS[operator]):
        raise HTTPException(status_code=400, detail="Cet opérateur n'est pas proposé pour les dons.")

    await _ensure_reference_is_new(db, operator.value, data.transaction_reference)

    donation = Donation(
        branch_id=data.branch_id,
        amount=data.amount,
        declared_amount=data.amount,
        currency=CURRENCY_BY_METHOD[PaymentMethodModel.MOBILE_MONEY],
        donor_email=data.donor_email,
        donor_name=data.donor_name or None,
        donor_phone=data.sender_phone,
        payment_method=PaymentMethodModel.MOBILE_MONEY,
        mobile_operator=operator.value,
        transaction_reference=data.transaction_reference,
        status=DonationStatusModel.PENDING,
    )
    db.add(donation)
    await _commit_or_conflict(db)
    await db.refresh(donation)

    await _notify_admins(
        db, donation, branch, "Don Mobile Money à vérifier",
        f"Réf. {donation.transaction_reference} ({MOBILE_OPERATOR_LABELS[operator]}).",
    )
    return DonationPublic.model_validate(donation)


# ============================================
# Admin
# ============================================

@router.get("", response_model=DonationListResponse)
async def list_donations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    branch_id: int | None = Query(None, description="Super Admin : limiter à une antenne"),
    status_filter: DonationStatusModel | None = Query(None, alias="status"),
    q: str | None = Query(None, max_length=100, description="Recherche : référence, téléphone, email, nom"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Lister les dons, avec filtres et recherche.
    Accessible: Admin de la branche (ses dons) + Super Admin (tous les dons, ou une antenne).
    """
    scope = resolve_branch_scope(user, branch_id)

    filters = []
    if scope is not None:
        filters.append(Donation.branch_id == scope)
    if status_filter is not None:
        filters.append(Donation.status == status_filter)
    if q and q.strip():
        # Les numéros et références sont stockés sans espaces
        pattern = like_pattern(q.replace(" ", ""))
        filters.append(
            or_(
                Donation.transaction_reference.ilike(pattern, escape="\\"),
                Donation.donor_phone.ilike(pattern, escape="\\"),
                Donation.donor_email.ilike(pattern, escape="\\"),
                Donation.donor_name.ilike(like_pattern(q), escape="\\"),
            )
        )

    total = await db.scalar(select(func.count(Donation.id)).where(*filters))

    query = (
        select(Donation)
        .where(*filters)
        .order_by(Donation.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    result = await db.execute(query)
    donations = result.scalars().all()

    return DonationListResponse(
        items=[DonationSchema.model_validate(d) for d in donations],
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=((total or 0) + page_size - 1) // page_size,
    )


@router.post("/manual", response_model=DonationSchema, status_code=201)
async def record_manual_donation(
    data: ManualDonationCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Enregistrer un paiement Mobile Money reçu sans déclaration du donateur (confirmé d'office).
    Accessible: Admin de la branche (pour son antenne) + Super Admin.
    """
    branch_id = user.branch_id if user.role == UserRole.BRANCH_ADMIN else data.branch_id
    await _verify_can_manage(user, branch_id)
    await _get_branch_or_404(db, branch_id)

    operator = MobileOperatorModel(data.operator.value)
    await _ensure_reference_is_new(db, operator.value, data.transaction_reference)

    donation = Donation(
        branch_id=branch_id,
        amount=data.amount,
        currency=CURRENCY_BY_METHOD[PaymentMethodModel.MOBILE_MONEY],
        donor_email=data.donor_email,
        donor_name=data.donor_name or None,
        donor_phone=data.sender_phone,
        payment_method=PaymentMethodModel.MOBILE_MONEY,
        mobile_operator=operator.value,
        transaction_reference=data.transaction_reference,
        status=DonationStatusModel.CONFIRMED,
        status_updated_at=datetime.now(timezone.utc),
    )
    db.add(donation)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Cette référence de transaction a déjà été déclarée.")
    _audit_donation(db, user, "create", donation)
    await _commit_or_conflict(db)
    await db.refresh(donation)

    background_tasks.add_task(_send_thank_you_email, donation.id)
    return DonationSchema.model_validate(donation)


async def _get_manageable_donation(db: AsyncSession, user: User, donation_id: int) -> Donation:
    donation = await db.get(Donation, donation_id)
    if not donation:
        raise HTTPException(status_code=404, detail="Don introuvable")
    await _verify_can_manage(user, donation.branch_id)
    if donation.payment_method == PaymentMethodModel.CARD:
        raise HTTPException(status_code=400, detail="Un don par carte est confirmé par le prestataire de paiement.")
    return donation


@router.post("/{donation_id}/confirm", response_model=DonationSchema)
async def confirm_donation(
    donation_id: int,
    data: DonationConfirm,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Valider un don après avoir retrouvé le paiement ; envoie l'email de remerciement."""
    donation = await _get_manageable_donation(db, user, donation_id)
    if donation.status != DonationStatusModel.PENDING:
        raise HTTPException(status_code=400, detail="Seul un don à vérifier peut être validé.")

    if data.transaction_reference and data.transaction_reference != donation.transaction_reference:
        await _ensure_reference_is_new(db, donation.mobile_operator, data.transaction_reference, exclude_id=donation.id)
        donation.transaction_reference = data.transaction_reference
    if data.amount is not None:
        donation.amount = data.amount

    donation.status = DonationStatusModel.CONFIRMED
    donation.rejection_reason = None
    donation.status_updated_at = datetime.now(timezone.utc)
    _audit_donation(db, user, "confirm", donation, declared_amount=float(donation.declared_amount or 0) or None)
    await _commit_or_conflict(db)
    await db.refresh(donation)

    background_tasks.add_task(_send_thank_you_email, donation.id)
    return DonationSchema.model_validate(donation)


@router.post("/{donation_id}/reject", response_model=DonationSchema)
async def reject_donation(
    donation_id: int,
    data: DonationReject,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Rejeter un don dont le paiement est introuvable ou non conforme (pas d'email)."""
    donation = await _get_manageable_donation(db, user, donation_id)
    if donation.status != DonationStatusModel.PENDING:
        raise HTTPException(status_code=400, detail="Seul un don à vérifier peut être rejeté.")

    donation.status = DonationStatusModel.REJECTED
    donation.rejection_reason = data.reason.strip()
    donation.status_updated_at = datetime.now(timezone.utc)
    _audit_donation(db, user, "reject", donation, reason=donation.rejection_reason)
    await db.commit()
    await db.refresh(donation)
    return DonationSchema.model_validate(donation)


@router.post("/{donation_id}/reopen", response_model=DonationSchema)
async def reopen_donation(
    donation_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Remettre un don validé ou rejeté "à vérifier" (erreur de manipulation)."""
    donation = await _get_manageable_donation(db, user, donation_id)
    if donation.payment_method == PaymentMethodModel.BANK_TRANSFER:
        raise HTTPException(status_code=400, detail="Le virement bancaire n'est plus proposé.")
    if donation.status == DonationStatusModel.CONFIRMED and user.role != UserRole.SUPER_ADMIN:
        # Un don confirmé rouvert redevient supprimable : réservé au Super Admin
        raise HTTPException(status_code=403, detail="Seul le Super Admin peut rouvrir un don confirmé.")

    previous_status = donation.status.value
    donation.status = DonationStatusModel.PENDING
    donation.rejection_reason = None
    donation.status_updated_at = datetime.now(timezone.utc)
    _audit_donation(db, user, "reopen", donation, previous_status=previous_status)
    await db.commit()
    await db.refresh(donation)
    return DonationSchema.model_validate(donation)


@router.delete("/{donation_id}", status_code=204)
async def delete_donation(
    donation_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Supprimer un don non validé (à vérifier ou rejeté). Un don confirmé correspond à de l'argent
    réellement reçu : il ne peut pas être supprimé (le rouvrir d'abord en cas d'erreur).
    """
    donation = await db.get(Donation, donation_id)
    if not donation:
        raise HTTPException(status_code=404, detail="Don introuvable")
    await _verify_can_manage(user, donation.branch_id)
    if donation.status == DonationStatusModel.CONFIRMED:
        raise HTTPException(status_code=400, detail="Un don confirmé ne peut pas être supprimé.")

    _audit_donation(db, user, "delete", donation, status=donation.status.value, donor_email=donation.donor_email)
    await db.delete(donation)
    await db.commit()
    return None
