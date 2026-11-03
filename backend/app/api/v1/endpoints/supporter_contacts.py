"""
Bienfaiteurs et parrains/marraines : ils laissent leurs coordonnées et l'association les recontacte.
Quand le Super Admin accepte leur adhésion, un compte leur est créé : ils voient alors les projets en
cours, sans pouvoir proposer de projet ni discuter. Fiches confidentielles, réservées au Super Admin.
"""

import secrets
from datetime import datetime, timezone
from typing import Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.api.deps import get_current_admin, get_db
from app.api.scope import like_pattern
from app.core.email import email_service
from app.core.permissions import verify_super_admin_only
from app.core.rate_limit import rate_limit
from app.core.security import hash_password
from app.models.supporter_contact import (
    KIND_BENEFACTOR,
    STATUS_ACCEPTED,
    STATUS_CONTACTED,
    SupporterContact,
)
from app.models.user import MembershipStatus, User, UserRole
from app.services.privacy import anonymize_user
from app.services.audit import record_audit
from app.services.notification_service import get_branch_notification_recipients, send_batch_notification
from app.services.translation import normalize_lang

router = APIRouter(prefix="/supporter-contacts", tags=["supporter-contacts"])

Kind = Literal["BENEFACTOR", "SPONSOR"]
Status = Literal["NEW", "CONTACTED"]  # ACCEPTED : seulement par /accept


# ============================================
# Public
# ============================================


class SupporterContactCreate(BaseModel):
    kind: Kind
    full_name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=50)
    message: Optional[str] = Field(None, max_length=2000)
    lang: str = Field("fr", max_length=8)
    website: Optional[str] = Field(None, max_length=255)  # piège anti-robot (doit rester vide)


class MessageResponse(BaseModel):
    message: str


@router.post(
    "",
    response_model=MessageResponse,
    status_code=status.HTTP_202_ACCEPTED,
    dependencies=[Depends(rate_limit("supporter_contact", limit=5, window=60 * 60))],
)
async def create_supporter_contact(data: SupporterContactCreate, db: AsyncSession = Depends(get_db)):
    """Laisser ses coordonnées pour être recontacté. Accessible: Public."""
    accepted = MessageResponse(message="Merci, nous vous contacterons très prochainement.")
    if data.website:
        return accepted

    contact = SupporterContact(
        kind=data.kind,
        full_name=data.full_name.strip(),
        email=data.email.strip().lower(),
        phone=(data.phone or "").strip() or None,
        message=(data.message or "").strip() or None,
        lang=normalize_lang(data.lang),
    )
    db.add(contact)
    await db.commit()

    # Notification sans nom : la fiche elle-même reste dans l'espace Super Admin
    await send_batch_notification(
        await get_branch_notification_recipients(db, None),
        title="Nouveau contact bienfaiteur" if data.kind == KIND_BENEFACTOR else "Nouveau contact parrain/marraine",
        message="Une personne a laissé ses coordonnées pour être recontactée.",
        notification_type="info",
        action_url=f"/admin/members?onglet={data.kind.lower()}",
        icon="member",
        db=db,
    )
    return accepted


# ============================================
# Back-office (Super Admin)
# ============================================


class SupporterContactRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: str
    full_name: str
    email: str
    phone: Optional[str] = None
    message: Optional[str] = None
    lang: str
    status: str
    created_at: datetime
    contacted_at: Optional[datetime] = None
    accepted_at: Optional[datetime] = None
    # Adhésion acceptée : le compte créé peut-il se connecter (accès non retiré) ?
    has_account_access: bool = False


class SupporterContactCounts(BaseModel):
    NEW: int = 0
    CONTACTED: int = 0
    ACCEPTED: int = 0


class SupporterContactListResponse(BaseModel):
    items: list[SupporterContactRead]
    total: int
    page: int
    page_size: int
    total_pages: int
    counts: SupporterContactCounts


class SupporterContactUpdate(BaseModel):
    status: Status


class SupporterAcceptRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)


class SupporterAcceptResponse(BaseModel):
    contact: SupporterContactRead
    # Mot de passe temporaire à communiquer à la personne (à changer à la première connexion)
    temporary_password: str
    welcome_email_sent: bool


class SupporterAccessRequest(BaseModel):
    active: bool


async def _read(db: AsyncSession, contact: SupporterContact) -> SupporterContactRead:
    account = await db.get(User, contact.user_id) if contact.user_id else None
    return SupporterContactRead.model_validate(contact).model_copy(
        update={"has_account_access": bool(account and account.membership_status == MembershipStatus.ACTIVE)}
    )


async def _get_contact(db: AsyncSession, contact_id: int) -> SupporterContact:
    contact = await db.get(SupporterContact, contact_id)
    if contact is None:
        raise HTTPException(status_code=404, detail="Contact introuvable")
    return contact


@router.get("", response_model=SupporterContactListResponse)
async def list_supporter_contacts(
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    kind: Optional[Kind] = Query(None),
    status_filter: Optional[Literal["NEW", "CONTACTED", "ACCEPTED"]] = Query(None, alias="status"),
    q: str | None = Query(None, max_length=100, description="Recherche dans le nom ou l'e-mail"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """Lister les contacts, avec le décompte par statut. Accessible: Super Admin only."""
    await verify_super_admin_only(user)
    filters = []
    if kind:
        filters.append(SupporterContact.kind == kind)
    count_rows = await db.execute(
        select(SupporterContact.status, func.count(SupporterContact.id)).where(*filters).group_by(SupporterContact.status)
    )
    counts = SupporterContactCounts(**{s: n for s, n in count_rows.all()})

    if status_filter:
        filters.append(SupporterContact.status == status_filter)
    if q and q.strip():
        pattern = like_pattern(q)
        filters.append(
            or_(SupporterContact.full_name.ilike(pattern, escape="\\"), SupporterContact.email.ilike(pattern, escape="\\"))
        )
    total = await db.scalar(select(func.count(SupporterContact.id)).where(*filters)) or 0
    result = await db.execute(
        select(SupporterContact)
        .where(*filters)
        .order_by(SupporterContact.created_at.desc(), SupporterContact.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    contacts = result.scalars().all()
    account_ids = [c.user_id for c in contacts if c.user_id]
    active_ids = set(
        (
            await db.scalars(
                select(User.id).where(User.id.in_(account_ids), User.membership_status == MembershipStatus.ACTIVE)
            )
        ).all()
    ) if account_ids else set()
    return SupporterContactListResponse(
        items=[
            SupporterContactRead.model_validate(c).model_copy(update={"has_account_access": c.user_id in active_ids})
            for c in contacts
        ],
        total=total, page=page, page_size=page_size, total_pages=(total + page_size - 1) // page_size, counts=counts,
    )


@router.patch("/{contact_id}", response_model=SupporterContactRead)
async def update_supporter_contact(
    contact_id: int,
    data: SupporterContactUpdate,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Marquer un contact comme recontacté (ou le remettre à traiter). Accessible: Super Admin only."""
    await verify_super_admin_only(user)
    contact = await _get_contact(db, contact_id)
    if contact.status == STATUS_ACCEPTED:
        raise HTTPException(status_code=409, detail="Adhésion déjà acceptée")
    contact.status = data.status
    contact.contacted_at = datetime.now(timezone.utc) if data.status == STATUS_CONTACTED else None
    record_audit(
        db, user=user, action="update", resource_type="supporter_contact", resource_id=contact.id,
        details={"status": data.status},
    )
    await db.commit()
    await db.refresh(contact)
    return await _read(db, contact)


@router.post("/{contact_id}/accept", response_model=SupporterAcceptResponse, status_code=status.HTTP_201_CREATED)
async def accept_supporter_contact(
    contact_id: int,
    data: SupporterAcceptRequest,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """
    Accepter l'adhésion : crée le compte du bienfaiteur ou du parrain/marraine (mot de passe
    temporaire, à changer à la première connexion). Accessible: Super Admin only.
    """
    await verify_super_admin_only(user)
    contact = await _get_contact(db, contact_id)
    if contact.status == STATUS_ACCEPTED:
        raise HTTPException(status_code=409, detail="Adhésion déjà acceptée")
    email = contact.email.lower()
    if await db.scalar(select(User.id).where(func.lower(User.email) == email)):
        raise HTTPException(status_code=409, detail="Un compte existe déjà avec cet email")

    temporary_password = secrets.token_urlsafe(12)
    account = User(
        email=email,
        first_name=data.first_name.strip(),
        last_name=data.last_name.strip(),
        phone=(contact.phone or "")[:30] or None,
        hashed_password=hash_password(temporary_password),
        role=UserRole.MEMBER,
        membership_type=contact.kind,
        membership_status=MembershipStatus.ACTIVE,
        must_change_password=True,
    )
    db.add(account)
    await db.flush()

    now = datetime.now(timezone.utc)
    contact.status = STATUS_ACCEPTED
    contact.accepted_at = now
    contact.contacted_at = contact.contacted_at or now
    contact.user_id = account.id
    record_audit(
        db, user=user, action="accept", resource_type="supporter_contact", resource_id=contact.id,
        details={"user_id": account.id, "kind": contact.kind},
    )
    await db.commit()
    await db.refresh(contact)

    # smtplib est bloquant : hors de la boucle asynchrone
    email_sent = await run_in_threadpool(
        email_service.send_supporter_welcome_email, user_email=account.email, user_name=account.full_name
    )
    return SupporterAcceptResponse(
        contact=await _read(db, contact), temporary_password=temporary_password, welcome_email_sent=email_sent
    )


@router.post("/{contact_id}/access", response_model=SupporterContactRead)
async def set_supporter_access(
    contact_id: int,
    data: SupporterAccessRequest,
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
):
    """Retirer (ou rendre) l'accès au compte d'un bienfaiteur ou parrain. Accessible: Super Admin only."""
    await verify_super_admin_only(user)
    contact = await _get_contact(db, contact_id)
    account = await db.get(User, contact.user_id) if contact.user_id else None
    if account is None:
        raise HTTPException(status_code=404, detail="Aucun compte pour ce contact")
    account.membership_status = MembershipStatus.ACTIVE if data.active else MembershipStatus.SUSPENDED
    if not data.active:
        account.token_version += 1  # sessions ouvertes fermées
    record_audit(
        db, user=user, action="update", resource_type="supporter_contact", resource_id=contact.id,
        details={"account_access": data.active},
    )
    await db.commit()
    return await _read(db, contact)


@router.delete("/{contact_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_supporter_contact(
    contact_id: int, user: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)
):
    """
    Supprimer définitivement un contact (droit à l'effacement, RGPD), et l'identité de son compte s'il
    en a un. Accessible: Super Admin only.
    """
    await verify_super_admin_only(user)
    contact = await _get_contact(db, contact_id)
    account = await db.get(User, contact.user_id) if contact.user_id else None
    if account is not None and account.anonymized_at is None:
        await anonymize_user(db, account, reason="fiche bienfaiteur/parrain supprimée par le Super Admin")
    record_audit(db, user=user, action="delete", resource_type="supporter_contact", resource_id=contact.id)
    await db.delete(contact)
    await db.commit()
    return None

