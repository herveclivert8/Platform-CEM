"""
Endpoints de l'adhésion des membres.

Parcours d'un membre (inscrit via /auth/register, adhésion PENDING) :
1. il paie ses frais d'inscription (carte, Mobile Money ou espèces) ;
2. l'admin de son antenne ou le Super Admin confirme le paiement puis valide l'adhésion (ACTIVE) :
   les frais d'inscription valent cotisation jusqu'à la prochaine échéance (le 30) ;
3. la cotisation se renouvelle le 30 de chaque mois : chaque cotisation confirmée couvre jusqu'à
   l'échéance suivante (User.paid_until). Non payée à l'échéance, le membre est désactivé
   automatiquement (SUSPENDED, voir app/services/membership.py) ; après son paiement, l'admin de son
   antenne le réactive. Seule la cotisation du mois en cours est due, pas les mois de désactivation.

Un membre validé et à jour de cotisation peut proposer des projets (publiés après validation du
Super Admin) et participer aux discussions. Sinon, il ne voit que l'interface des visiteurs.
"""

import html
from datetime import date, datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_admin, get_current_user, get_db
from app.api.scope import like_pattern, resolve_branch_scope
from app.api.v1.endpoints.donations import OPERATOR_NUMBER_FIELDS, SETTINGS_ID
from app.api.v1.endpoints.projects import _get_project_or_404, _query as project_query, notify_member_proposal
from app.core.permissions import verify_branch_access, verify_super_admin_only
from app.core.rate_limit import rate_limit
from app.core.security import verify_password
from app.models import Branch, Donation, MembershipPayment, Project, ProjectComment, ProjectImage, UploadedFile, User
from app.models.membership import (
    MEMBERSHIP_FEES,
    MembershipPaymentKind as KindModel,
    MembershipPaymentMethod as MethodModel,
    MembershipPaymentStatus as PaymentStatusModel,
)
from app.models.project import ProjectPhase, ProjectReviewStatus
from app.models.settings import AssociationSettings
from app.models.user import MembershipStatus as MembershipStatusModel, UserRole
from app.schemas.membership import (
    AccountDeletion,
    AdminCashPayment,
    CardMembershipPayment,
    CashMembershipPayment,
    MemberAdmin,
    MemberListResponse,
    AvatarUpdate,
    MemberProfileUpdate,
    MemberProjectCreate,
    MyDiscussion,
    MembershipFees,
    MembershipPayment as MembershipPaymentSchema,
    MembershipPaymentAdmin,
    MembershipPaymentListResponse,
    MembershipPaymentStatus,
    MembershipStatus,
    MembershipSummary,
    MobileMoneyMembershipPayment,
    RejectReason,
)
from app.schemas.project import Project as ProjectSchema
from app.services.audit import record_audit
from app.services.notification_service import get_branch_notification_recipients, send_batch_notification
from app.services import membership as membership_dates
from app.services.payments import get_card_provider
from app.services.privacy import anonymize_user, export_user_data
from app.services.project_documents import attach_documents

router = APIRouter(prefix="/members", tags=["members"])

# Une cotisation ne peut pas être payée plus d'un an à l'avance
MAX_PREPAID = timedelta(days=366)

KIND_LABELS = {KindModel.REGISTRATION: "frais d'inscription", KindModel.MONTHLY: "cotisation mensuelle"}
CURRENCY_SYMBOLS = {"MGA": "Ar", "EUR": "€", "USD": "$"}


# ============================================
# Helpers
# ============================================


def _today() -> date:
    return membership_dates.today()


def _suspend_if_overdue(user: User) -> None:
    """Désactivation immédiate (sans attendre la vérification horaire) d'un membre dont l'échéance est passée."""
    if user.membership_status == MembershipStatusModel.ACTIVE and (not user.paid_until or user.paid_until < _today()):
        user.membership_status = MembershipStatusModel.SUSPENDED


def _format_amount(amount: float, currency: str) -> str:
    value = f"{amount:,.0f}" if currency == "MGA" else f"{amount:,.2f}".rstrip("0").rstrip(".")
    return f"{value.replace(',', ' ')} {CURRENCY_SYMBOLS.get(currency, currency)}"


async def get_current_member(user: User = Depends(get_current_user)) -> User:
    """Membre connecté (pas un admin)."""
    if user.role != UserRole.MEMBER:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Réservé aux membres")
    return user


async def get_member_with_access(user: User = Depends(get_current_member)) -> User:
    """Membre validé et à jour de cotisation."""
    if not user.has_member_access(_today()):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Adhésion non validée ou cotisation du mois non payée",
        )
    return user


async def _payments_of(db: AsyncSession, user_id: int) -> list[MembershipPayment]:
    result = await db.execute(
        select(MembershipPayment)
        .where(MembershipPayment.user_id == user_id)
        .order_by(MembershipPayment.created_at.desc(), MembershipPayment.id.desc())
    )
    return list(result.scalars().all())


def _summary(user: User, payments: list[MembershipPayment]) -> MembershipSummary:
    def has(kind: KindModel, payment_status: PaymentStatusModel) -> bool:
        return any(p.kind == kind and p.status == payment_status for p in payments)

    return MembershipSummary(
        membership_status=MembershipStatus(user.membership_status.value),
        paid_until=user.paid_until,
        has_access=user.has_member_access(_today()),
        registration_paid=has(KindModel.REGISTRATION, PaymentStatusModel.CONFIRMED),
        registration_pending=has(KindModel.REGISTRATION, PaymentStatusModel.PENDING),
        monthly_pending=has(KindModel.MONTHLY, PaymentStatusModel.PENDING),
        payments=[MembershipPaymentSchema.model_validate(p) for p in payments],
        member_number=user.id,
        member_since=user.created_at,
    )


async def _check_can_pay(db: AsyncSession, user: User, kind: KindModel) -> None:
    """Règles communes aux trois modes de paiement."""
    if user.membership_status == MembershipStatusModel.REJECTED:
        raise HTTPException(status_code=400, detail="Votre demande d'adhésion a été refusée.")

    payments = await _payments_of(db, user.id)
    if kind == KindModel.REGISTRATION:
        if any(p.kind == kind and p.status != PaymentStatusModel.REJECTED for p in payments):
            raise HTTPException(status_code=409, detail="Vos frais d'inscription sont déjà payés ou en cours de vérification.")
        return

    # Un membre désactivé paie la cotisation du mois en cours, puis l'admin le réactive
    if user.membership_status not in (MembershipStatusModel.ACTIVE, MembershipStatusModel.SUSPENDED):
        raise HTTPException(status_code=400, detail="La cotisation se paie une fois votre adhésion validée.")
    if any(p.kind == kind and p.status == PaymentStatusModel.PENDING for p in payments):
        raise HTTPException(status_code=409, detail="Une cotisation est déjà en cours de vérification.")
    if user.paid_until and user.paid_until > _today() + MAX_PREPAID:
        raise HTTPException(status_code=400, detail="Votre cotisation est déjà payée pour plus d'un an.")


def _extend_access(user: User, payment: MembershipPayment) -> None:
    """
    Paiement confirmé : couvert jusqu'à l'échéance (le 30) suivant le mois déjà payé ; en retard (ou
    première cotisation), jusqu'à la prochaine échéance seulement : les mois de désactivation ne sont pas dus.
    """
    today = _today()
    covered = user.paid_until if user.paid_until and user.paid_until >= today else None
    payment.period_start = covered + timedelta(days=1) if covered else today
    payment.period_end = membership_dates.next_due_after(covered or today)
    user.paid_until = payment.period_end


async def _ensure_uploaded_by(db: AsyncSession, user: User, url: str) -> None:
    """Seule une image envoyée sur le site par ce membre est acceptée (pas d'image externe)."""
    filename = url.rstrip("/").rsplit("/", 1)[-1]
    uploaded = await db.scalar(
        select(UploadedFile.filename).where(UploadedFile.filename == filename, UploadedFile.uploaded_by_id == user.id)
    )
    if not uploaded:
        raise HTTPException(status_code=400, detail="Photo invalide : envoyez-la à nouveau.")


async def _notify_admins_of_payment(db: AsyncSession, user: User, payment: MembershipPayment, title: str) -> None:
    await send_batch_notification(
        await get_branch_notification_recipients(db, user.branch_id),
        title=title,
        message=(
            f"{user.full_name} : {KIND_LABELS[payment.kind]}, "
            f"{_format_amount(float(payment.amount), payment.currency)}."
            + (" Compte désactivé : à réactiver une fois le paiement reçu." if user.membership_status == MembershipStatusModel.SUSPENDED else "")
        ),
        notification_type="info" if payment.status == PaymentStatusModel.PENDING else "success",
        action_url="/admin/members",
        icon="donation",
        db=db,
    )


async def _ensure_reference_is_new(db: AsyncSession, operator: str, reference: str) -> None:
    """Une référence Mobile Money ne sert qu'une fois, pour un don comme pour une cotisation."""
    used = await db.scalar(
        select(MembershipPayment.id).where(
            MembershipPayment.mobile_operator == operator, MembershipPayment.transaction_reference == reference
        )
    ) or await db.scalar(
        select(Donation.id).where(Donation.mobile_operator == operator, Donation.transaction_reference == reference)
    )
    if used:
        raise HTTPException(status_code=409, detail="Cette référence de transaction a déjà été déclarée.")


# ============================================
# Public
# ============================================


@router.get("/fees", response_model=MembershipFees)
async def get_fees():
    """Frais d'inscription et cotisation mensuelle, par devise (montants simulés). Accessible: Public."""
    return MembershipFees(
        registration=MEMBERSHIP_FEES[KindModel.REGISTRATION],
        monthly=MEMBERSHIP_FEES[KindModel.MONTHLY],
    )


# ============================================
# Membre connecté
# ============================================


@router.get("/me", response_model=MembershipSummary)
async def get_my_membership(user: User = Depends(get_current_member), db: AsyncSession = Depends(get_db)):
    """État de l'adhésion et historique des paiements du membre connecté."""
    _suspend_if_overdue(user)
    await db.commit()
    return _summary(user, await _payments_of(db, user.id))


@router.post(
    "/me/payments/card",
    response_model=MembershipSummary,
    status_code=201,
    dependencies=[Depends(rate_limit("membership_card", limit=10, window=60 * 60))],
)
async def pay_by_card(
    data: CardMembershipPayment,
    user: User = Depends(get_current_member),
    db: AsyncSession = Depends(get_db),
):
    """Payer par carte : enregistré (et confirmé) seulement si le prestataire accepte le paiement."""
    provider = get_card_provider()
    if provider is None:
        raise HTTPException(status_code=400, detail="Le paiement par carte n'est pas disponible pour le moment.")
    kind = KindModel(data.kind.value)
    await _check_can_pay(db, user, kind)

    currency = data.currency.value
    amount = MEMBERSHIP_FEES[kind][currency]
    result = await provider.charge(
        amount=amount, currency=currency, token=data.payment_token,
        description=f"CEM — {KIND_LABELS[kind]} ({user.email})",
    )
    if not result.success:
        raise HTTPException(status_code=402, detail=result.failure_message or "Paiement refusé.")

    payment = MembershipPayment(
        user_id=user.id,
        branch_id=user.branch_id,
        kind=kind,
        amount=amount,
        currency=currency,
        payment_method=MethodModel.CARD,
        transaction_reference=result.payment_id,
        status=PaymentStatusModel.CONFIRMED,
        reviewed_at=datetime.now(timezone.utc),
    )
    if kind == KindModel.MONTHLY:
        _extend_access(user, payment)
    db.add(payment)
    await db.commit()

    await _notify_admins_of_payment(db, user, payment, "Paiement de membre par carte")
    return _summary(user, await _payments_of(db, user.id))


@router.post(
    "/me/payments/mobile-money",
    response_model=MembershipSummary,
    status_code=201,
    dependencies=[Depends(rate_limit("membership_mobile_money", limit=10, window=60 * 60))],
)
async def declare_mobile_money(
    data: MobileMoneyMembershipPayment,
    user: User = Depends(get_current_member),
    db: AsyncSession = Depends(get_db),
):
    """Déclarer un paiement Mobile Money déjà effectué (en ariary), à vérifier par un admin."""
    kind = KindModel(data.kind.value)
    await _check_can_pay(db, user, kind)

    settings = await db.get(AssociationSettings, SETTINGS_ID)
    if not settings or not getattr(settings, OPERATOR_NUMBER_FIELDS[data.operator]):
        raise HTTPException(status_code=400, detail="Cet opérateur n'est pas proposé.")
    await _ensure_reference_is_new(db, data.operator.value, data.transaction_reference)

    payment = MembershipPayment(
        user_id=user.id,
        branch_id=user.branch_id,
        kind=kind,
        amount=MEMBERSHIP_FEES[kind]["MGA"],
        currency="MGA",
        payment_method=MethodModel.MOBILE_MONEY,
        mobile_operator=data.operator.value,
        sender_phone=data.sender_phone,
        transaction_reference=data.transaction_reference,
        status=PaymentStatusModel.PENDING,
    )
    db.add(payment)
    await db.commit()

    await _notify_admins_of_payment(db, user, payment, "Paiement Mobile Money de membre à vérifier")
    return _summary(user, await _payments_of(db, user.id))


@router.post("/me/payments/cash", response_model=MembershipSummary, status_code=201)
async def declare_cash(
    data: CashMembershipPayment,
    user: User = Depends(get_current_member),
    db: AsyncSession = Depends(get_db),
):
    """Annoncer un paiement en espèces à l'antenne ; un admin le confirme à la réception de l'argent."""
    kind = KindModel(data.kind.value)
    await _check_can_pay(db, user, kind)

    currency = data.currency.value
    payment = MembershipPayment(
        user_id=user.id,
        branch_id=user.branch_id,
        kind=kind,
        amount=MEMBERSHIP_FEES[kind][currency],
        currency=currency,
        payment_method=MethodModel.CASH,
        status=PaymentStatusModel.PENDING,
    )
    db.add(payment)
    await db.commit()

    await _notify_admins_of_payment(db, user, payment, "Paiement en espèces annoncé")
    return _summary(user, await _payments_of(db, user.id))


@router.patch("/me/profile", status_code=204)
async def update_my_profile(
    data: MemberProfileUpdate,
    user: User = Depends(get_current_member),
    db: AsyncSession = Depends(get_db),
):
    """Modifier son nom et son téléphone. L'email (identifiant) et l'antenne ne changent pas ici."""
    user.first_name = data.first_name
    user.last_name = data.last_name
    user.phone = data.phone
    await db.commit()


@router.get("/me/export")
async def export_my_data(user: User = Depends(get_current_member), db: AsyncSession = Depends(get_db)):
    """Télécharger toutes ses données personnelles (droit d'accès et à la portabilité), en JSON."""
    data = await export_user_data(db, user)
    return JSONResponse(
        data,
        headers={
            "Content-Disposition": 'attachment; filename="mes-donnees-cem.json"',
            "Cache-Control": "private, no-store",
        },
    )


@router.post(
    "/me/delete",
    status_code=204,
    dependencies=[Depends(rate_limit("account_delete", limit=5, window=15 * 60))],
)
async def delete_my_account(
    data: AccountDeletion,
    user: User = Depends(get_current_member),
    db: AsyncSession = Depends(get_db),
):
    """
    Supprimer son compte (droit à l'effacement), mot de passe à l'appui. Immédiat et définitif :
    l'identité est effacée, les sessions fermées (voir app/services/privacy.py).
    """
    if not user.hashed_password or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Mot de passe incorrect.")
    await anonymize_user(db, user, reason="demande du membre")
    await db.commit()


@router.put("/me/avatar", status_code=204)
async def set_my_avatar(
    data: AvatarUpdate,
    user: User = Depends(get_current_member),
    db: AsyncSession = Depends(get_db),
):
    """Photo de profil (envoyée au préalable par POST /upload/image), ou null pour la retirer."""
    if data.avatar_url:
        await _ensure_uploaded_by(db, user, data.avatar_url)
    user.avatar_url = data.avatar_url or None
    await db.commit()


@router.get("/me/discussions", response_model=list[MyDiscussion])
async def list_my_discussions(user: User = Depends(get_member_with_access), db: AsyncSession = Depends(get_db)):
    """Projets publiés sur lesquels le membre a commenté, les plus récemment actifs d'abord."""
    mine = (
        select(ProjectComment.project_id, func.count(ProjectComment.id).label("my_comments"))
        .where(ProjectComment.author_id == user.id)
        .group_by(ProjectComment.project_id)
        .subquery()
    )
    totals = (
        select(
            ProjectComment.project_id,
            func.count(ProjectComment.id).label("total_comments"),
            func.max(ProjectComment.created_at).label("last_activity_at"),
        )
        .group_by(ProjectComment.project_id)
        .subquery()
    )
    rows = await db.execute(
        select(Project, Branch.name, mine.c.my_comments, totals.c.total_comments, totals.c.last_activity_at)
        .join(mine, mine.c.project_id == Project.id)
        .join(totals, totals.c.project_id == Project.id)
        .join(Branch, Branch.id == Project.branch_id)
        .where(Project.review_status == ProjectReviewStatus.APPROVED, Project.is_visible.is_(True))
        .order_by(totals.c.last_activity_at.desc())
        .limit(50)
    )
    return [
        MyDiscussion(
            project_id=project.id,
            title=project.title,
            phase=project.phase.value if hasattr(project.phase, "value") else project.phase,
            branch_name=branch_name,
            my_comments=my_comments,
            total_comments=total_comments,
            last_activity_at=last_activity_at,
        )
        for project, branch_name, my_comments, total_comments, last_activity_at in rows.all()
    ]


@router.get("/me/projects", response_model=list[ProjectSchema])
async def list_my_projects(user: User = Depends(get_current_member), db: AsyncSession = Depends(get_db)):
    """Projets proposés par le membre connecté, tous statuts confondus."""
    result = await db.execute(
        project_query().where(Project.author_id == user.id).order_by(Project.created_at.desc(), Project.id.desc())
    )
    return [ProjectSchema.from_orm_project(p) for p in result.scalars().all()]


@router.post("/me/projects", response_model=ProjectSchema, status_code=201)
async def create_my_project(
    data: MemberProjectCreate,
    user: User = Depends(get_member_with_access),
    db: AsyncSession = Depends(get_db),
):
    """
    Proposer un projet pour son antenne. Il reste en attente (invisible sur le site) jusqu'à
    sa validation par l'admin de l'antenne (ou le Super Admin).
    """
    if user.branch_id is None:
        raise HTTPException(status_code=400, detail="Vous n'êtes rattaché à aucune antenne.")

    images = []
    if data.image:
        await _ensure_uploaded_by(db, user, data.image)
        images = [ProjectImage(url=data.image, position=0)]

    # Texte brut saisi par le membre → paragraphes HTML (la description des projets est du HTML)
    paragraphs = [p.strip() for p in data.description.split("\n") if p.strip()]
    project = Project(
        branch_id=user.branch_id,
        author_id=user.id,
        title=data.title.strip(),
        summary=data.summary.strip(),
        description="".join(f"<p>{html.escape(p)}</p>" for p in paragraphs),
        pillar=data.pillar.value,
        beneficiaries=data.beneficiaries.strip(),
        location=data.location.strip() if data.location else None,
        phase=ProjectPhase.ONGOING,
        review_status=ProjectReviewStatus.PENDING,
        images=images,
    )
    db.add(project)
    await db.flush()
    await db.refresh(project, ["documents"])
    await attach_documents(db, project, data.document_ids, user)
    await db.commit()

    project = await _get_project_or_404(db, project.id)
    await notify_member_proposal(db, project, user)
    return ProjectSchema.from_orm_project(project)


# ============================================
# Back-office
# ============================================


async def _verify_can_manage(user: User, branch_id: int | None) -> None:
    """Admin de l'antenne du membre, ou Super Admin (seul habilité si le membre n'a plus d'antenne)."""
    if branch_id is None:
        await verify_super_admin_only(user)
    else:
        await verify_branch_access(user, branch_id)


async def _get_member_or_404(db: AsyncSession, member_id: int) -> User:
    member = await db.scalar(
        select(User).options(selectinload(User.branch)).where(User.id == member_id, User.role == UserRole.MEMBER)
    )
    if not member:
        raise HTTPException(status_code=404, detail="Membre introuvable")
    return member


def _paginate(total: int, page: int, page_size: int) -> dict:
    return {"total": total, "page": page, "page_size": page_size, "total_pages": (total + page_size - 1) // page_size}


@router.get("/admin", response_model=MemberListResponse)
async def list_members(
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    membership_status: MembershipStatus | None = Query(None),
    branch_id: int | None = Query(None),
    q: str | None = Query(None, max_length=100, description="Recherche : nom, email, téléphone"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Lister les membres. Accessible: Admin d'antenne (la sienne) + Super Admin."""
    scope = resolve_branch_scope(user, branch_id)
    # Statuts à jour même si la vérification horaire n'est pas encore passée depuis l'échéance
    await membership_dates.suspend_overdue_members(db)
    # Comptes supprimés (anonymisés) : plus des membres, seulement le support des cotisations passées
    filters = [User.role == UserRole.MEMBER, User.anonymized_at.is_(None)]
    if scope is not None:
        filters.append(User.branch_id == scope)
    if membership_status:
        filters.append(User.membership_status == membership_status.value)
    if q and q.strip():
        pattern = like_pattern(q)
        filters.append(
            or_(
                User.first_name.ilike(pattern),
                User.last_name.ilike(pattern),
                User.email.ilike(pattern),
                User.phone.ilike(pattern),
            )
        )

    total = await db.scalar(select(func.count(User.id)).where(*filters)) or 0
    result = await db.execute(
        select(User)
        .options(selectinload(User.branch))
        .where(*filters)
        .order_by(User.created_at.desc(), User.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    members = list(result.scalars().all())

    ids = [m.id for m in members]
    registration_paid: set[int] = set()
    pending: dict[int, int] = {}
    if ids:
        paid_rows = await db.execute(
            select(MembershipPayment.user_id).where(
                MembershipPayment.user_id.in_(ids),
                MembershipPayment.kind == KindModel.REGISTRATION,
                MembershipPayment.status == PaymentStatusModel.CONFIRMED,
            )
        )
        registration_paid = set(paid_rows.scalars().all())
        pending_rows = await db.execute(
            select(MembershipPayment.user_id, func.count(MembershipPayment.id))
            .where(MembershipPayment.user_id.in_(ids), MembershipPayment.status == PaymentStatusModel.PENDING)
            .group_by(MembershipPayment.user_id)
        )
        pending = dict(pending_rows.all())

    today = _today()
    return MemberListResponse(
        items=[
            MemberAdmin(
                id=m.id,
                email=m.email,
                first_name=m.first_name,
                last_name=m.last_name,
                phone=m.phone,
                branch_id=m.branch_id,
                branch_name=m.branch.name if m.branch else None,
                membership_status=MembershipStatus(m.membership_status.value),
                paid_until=m.paid_until,
                has_access=m.has_member_access(today),
                registration_paid=m.id in registration_paid,
                pending_payments=pending.get(m.id, 0),
                created_at=m.created_at,
            )
            for m in members
        ],
        **_paginate(total, page, page_size),
    )


@router.post("/admin/{member_id}/approve", status_code=204)
async def approve_member(member_id: int, user: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """
    Valider l'adhésion d'un membre dont les frais d'inscription ont été reçus. Ces frais valant
    cotisation du premier mois, le membre a accès aux privilèges dès la validation, pour un mois.
    """
    member = await _get_member_or_404(db, member_id)
    await _verify_can_manage(user, member.branch_id)
    if member.membership_status == MembershipStatusModel.ACTIVE:
        raise HTTPException(status_code=400, detail="Cette adhésion est déjà validée.")
    if member.membership_status == MembershipStatusModel.SUSPENDED:
        raise HTTPException(status_code=400, detail="Ce compte est désactivé : utilisez « Réactiver » après le paiement de la cotisation.")

    registration = await db.scalar(
        select(MembershipPayment).where(
            MembershipPayment.user_id == member.id,
            MembershipPayment.kind == KindModel.REGISTRATION,
            MembershipPayment.status == PaymentStatusModel.CONFIRMED,
        )
    )
    if not registration:
        raise HTTPException(status_code=400, detail="Les frais d'inscription de ce membre n'ont pas encore été confirmés.")

    member.membership_status = MembershipStatusModel.ACTIVE
    # Les frais d'inscription valent cotisation du premier mois, à partir de la validation (une seule
    # fois : une adhésion refusée puis validée à nouveau ne redonne pas de mois gratuit)
    if registration.period_start is None:
        _extend_access(member, registration)
    record_audit(
        db, user=user, action="confirm", resource_type="member", resource_id=member.id,
        branch_id=member.branch_id, details={"name": member.full_name},
    )
    await db.commit()


@router.post("/admin/{member_id}/reactivate", status_code=204)
async def reactivate_member(member_id: int, user: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """
    Réactiver un compte désactivé faute de cotisation, une fois la cotisation du mois en cours payée.
    Accessible: Admin de l'antenne du membre + Super Admin.
    """
    member = await _get_member_or_404(db, member_id)
    await _verify_can_manage(user, member.branch_id)
    if member.membership_status != MembershipStatusModel.SUSPENDED:
        raise HTTPException(status_code=400, detail="Ce compte n'est pas désactivé.")
    if not member.paid_until or member.paid_until < _today():
        raise HTTPException(
            status_code=400,
            detail="La cotisation du mois n'est pas encore payée : enregistrez ou confirmez d'abord son paiement.",
        )

    member.membership_status = MembershipStatusModel.ACTIVE
    record_audit(
        db, user=user, action="reactivate", resource_type="member", resource_id=member.id,
        branch_id=member.branch_id, details={"name": member.full_name, "paid_until": member.paid_until.isoformat()},
    )
    await db.commit()


@router.post("/admin/{member_id}/reject", status_code=204)
async def reject_member(
    member_id: int,
    data: RejectReason,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Refuser (ou retirer) l'adhésion d'un membre."""
    member = await _get_member_or_404(db, member_id)
    await _verify_can_manage(user, member.branch_id)

    member.membership_status = MembershipStatusModel.REJECTED
    record_audit(
        db, user=user, action="reject", resource_type="member", resource_id=member.id,
        branch_id=member.branch_id, details={"name": member.full_name, "reason": data.reason.strip()},
    )
    await db.commit()


@router.post("/admin/{member_id}/payments/cash", response_model=MembershipPaymentSchema, status_code=201)
async def record_cash_payment(
    member_id: int,
    data: AdminCashPayment,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Enregistrer des espèces reçues au guichet (confirmé d'office). Une cotisation prolonge
    aussitôt l'accès du membre d'un mois. Accessible: Admin de l'antenne du membre + Super Admin.
    """
    member = await _get_member_or_404(db, member_id)
    await _verify_can_manage(user, member.branch_id)
    kind = KindModel(data.kind.value)

    if member.membership_status == MembershipStatusModel.REJECTED:
        raise HTTPException(status_code=400, detail="L'adhésion de ce membre a été refusée.")
    payments = await _payments_of(db, member.id)
    # Un paiement déjà annoncé par le membre se confirme dans la liste des paiements (pas de doublon)
    if any(p.kind == kind and p.status == PaymentStatusModel.PENDING for p in payments):
        raise HTTPException(
            status_code=409,
            detail="Ce membre a déjà déclaré ce paiement : confirmez-le dans l'onglet Paiements.",
        )
    if kind == KindModel.REGISTRATION:
        if any(p.kind == kind and p.status == PaymentStatusModel.CONFIRMED for p in payments):
            raise HTTPException(status_code=409, detail="Les frais d'inscription de ce membre sont déjà payés.")
    else:
        if member.membership_status not in (MembershipStatusModel.ACTIVE, MembershipStatusModel.SUSPENDED):
            raise HTTPException(status_code=400, detail="Validez d'abord l'adhésion avant d'encaisser une cotisation.")
        if member.paid_until and member.paid_until > _today() + MAX_PREPAID:
            raise HTTPException(status_code=400, detail="La cotisation de ce membre est déjà payée pour plus d'un an.")

    currency = data.currency.value
    payment = MembershipPayment(
        user_id=member.id,
        branch_id=member.branch_id,
        kind=kind,
        amount=MEMBERSHIP_FEES[kind][currency],
        currency=currency,
        payment_method=MethodModel.CASH,
        status=PaymentStatusModel.CONFIRMED,
        reviewed_by_id=user.id,
        reviewed_at=datetime.now(timezone.utc),
    )
    if kind == KindModel.MONTHLY:
        _extend_access(member, payment)
    db.add(payment)
    await db.flush()
    record_audit(
        db, user=user, action="create", resource_type="membership_payment", resource_id=payment.id,
        branch_id=member.branch_id,
        details={"member": member.full_name, "amount": _format_amount(float(payment.amount), currency), "method": "cash"},
    )
    await db.commit()
    await db.refresh(payment)
    return MembershipPaymentSchema.model_validate(payment)


@router.get("/admin/payments", response_model=MembershipPaymentListResponse)
async def list_payments(
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    payment_status: MembershipPaymentStatus | None = Query(None, alias="status"),
    branch_id: int | None = Query(None),
    member_id: int | None = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Lister les paiements des membres. Accessible: Admin d'antenne (la sienne) + Super Admin."""
    scope = resolve_branch_scope(user, branch_id)
    filters = []
    if scope is not None:
        filters.append(MembershipPayment.branch_id == scope)
    if payment_status:
        filters.append(MembershipPayment.status == payment_status.value)
    if member_id:
        filters.append(MembershipPayment.user_id == member_id)

    total = await db.scalar(select(func.count(MembershipPayment.id)).where(*filters)) or 0
    result = await db.execute(
        select(MembershipPayment)
        .options(selectinload(MembershipPayment.user), selectinload(MembershipPayment.branch))
        .where(*filters)
        .order_by(MembershipPayment.created_at.desc(), MembershipPayment.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return MembershipPaymentListResponse(
        items=[
            MembershipPaymentAdmin(
                **MembershipPaymentSchema.model_validate(p).model_dump(),
                member_name=p.user.full_name,
                member_email=p.user.email,
                branch_name=p.branch.name if p.branch else None,
            )
            for p in result.scalars().all()
        ],
        **_paginate(total, page, page_size),
    )


async def _get_pending_payment(db: AsyncSession, user: User, payment_id: int) -> MembershipPayment:
    payment = await db.scalar(
        select(MembershipPayment).options(selectinload(MembershipPayment.user)).where(MembershipPayment.id == payment_id)
    )
    if not payment:
        raise HTTPException(status_code=404, detail="Paiement introuvable")
    await _verify_can_manage(user, payment.branch_id)
    if payment.status != PaymentStatusModel.PENDING:
        raise HTTPException(status_code=400, detail="Seul un paiement à vérifier peut être confirmé ou rejeté.")
    return payment


@router.post("/admin/payments/{payment_id}/confirm", response_model=MembershipPaymentSchema)
async def confirm_payment(payment_id: int, user: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Confirmer un paiement Mobile Money ou espèces après réception de l'argent."""
    payment = await _get_pending_payment(db, user, payment_id)
    payment.status = PaymentStatusModel.CONFIRMED
    payment.reviewed_by_id = user.id
    payment.reviewed_at = datetime.now(timezone.utc)
    if payment.kind == KindModel.MONTHLY:
        _extend_access(payment.user, payment)
    record_audit(
        db, user=user, action="confirm", resource_type="membership_payment", resource_id=payment.id,
        branch_id=payment.branch_id,
        details={"member": payment.user.full_name, "amount": _format_amount(float(payment.amount), payment.currency)},
    )
    await db.commit()
    await db.refresh(payment)
    return MembershipPaymentSchema.model_validate(payment)


@router.post("/admin/payments/{payment_id}/reject", response_model=MembershipPaymentSchema)
async def reject_payment(
    payment_id: int,
    data: RejectReason,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Rejeter un paiement introuvable ou non conforme : le membre peut en déclarer un autre."""
    payment = await _get_pending_payment(db, user, payment_id)
    payment.status = PaymentStatusModel.REJECTED
    payment.rejection_reason = data.reason.strip()
    payment.reviewed_by_id = user.id
    payment.reviewed_at = datetime.now(timezone.utc)
    record_audit(
        db, user=user, action="reject", resource_type="membership_payment", resource_id=payment.id,
        branch_id=payment.branch_id, details={"member": payment.user.full_name, "reason": payment.rejection_reason},
    )
    await db.commit()
    await db.refresh(payment)
    return MembershipPaymentSchema.model_validate(payment)
