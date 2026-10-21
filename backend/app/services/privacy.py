"""
Données personnelles des membres : export (droit d'accès et à la portabilité), suppression du
compte (droit à l'effacement) et durées de conservation (politique de confidentialité, page
/confidentialite du site).

La suppression est une ANONYMISATION : la ligne users reste, car les cotisations payées sont des
écritures comptables à conserver (elles en dépendent), mais elle ne contient plus aucune donnée
personnelle. Les projets et messages publiés restent, signés « Membre supprimé ».
"""

import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.storage import get_storage_backend
from app.models import (
    AuditLog,
    Donation,
    MembershipPayment,
    NewsletterSubscriber,
    Notification,
    Project,
    ProjectComment,
    ProjectSubmission,
    User,
)
from app.models.password_reset_token import PasswordResetToken
from app.models.user import MembershipStatus, UserRole, new_badge_token
from app.services import membership as membership_dates
from app.services.audit import record_audit

logger = logging.getLogger(__name__)

DELETED_FIRST_NAME = "Membre"
DELETED_LAST_NAME = "supprimé"


def _iso(value) -> str | None:
    return value.isoformat() if value else None


async def export_user_data(db: AsyncSession, user: User) -> dict:
    """Toutes les données personnelles du membre, dans un format lisible et réutilisable (JSON)."""
    email = user.email.lower()
    payments = (await db.scalars(select(MembershipPayment).where(MembershipPayment.user_id == user.id).order_by(MembershipPayment.created_at))).all()
    projects = (await db.scalars(select(Project).where(Project.author_id == user.id).order_by(Project.created_at))).all()
    comments = (await db.scalars(select(ProjectComment).where(ProjectComment.author_id == user.id).order_by(ProjectComment.created_at))).all()
    donations = (await db.scalars(select(Donation).where(Donation.donor_email.ilike(email)).order_by(Donation.created_at))).all()
    submissions = (await db.scalars(select(ProjectSubmission).where(ProjectSubmission.email.ilike(email)))).all()
    newsletter = await db.scalar(select(NewsletterSubscriber).where(NewsletterSubscriber.email.ilike(email)))

    return {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "account": {
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "phone": user.phone,
            "avatar_url": user.avatar_url,
            "role": user.role.value,
            "branch": user.branch.name if user.branch else None,
            "membership_status": user.membership_status.value if user.membership_status else None,
            "paid_until": _iso(user.paid_until),
            "created_at": _iso(user.created_at),
        },
        "membership_payments": [
            {
                "kind": p.kind.value, "amount": float(p.amount), "currency": p.currency,
                "payment_method": p.payment_method.value, "mobile_operator": p.mobile_operator,
                "sender_phone": p.sender_phone, "transaction_reference": p.transaction_reference,
                "status": p.status.value, "period_start": _iso(p.period_start), "period_end": _iso(p.period_end),
                "created_at": _iso(p.created_at),
            }
            for p in payments
        ],
        "projects": [
            {"title": p.title, "phase": p.phase.value, "review_status": p.review_status.value, "created_at": _iso(p.created_at)}
            for p in projects
        ],
        "comments": [{"project_id": c.project_id, "body": c.body, "created_at": _iso(c.created_at)} for c in comments],
        "donations": [
            {"amount": float(d.amount), "currency": d.currency, "status": d.status.value, "created_at": _iso(d.created_at)}
            for d in donations
        ],
        "project_submissions": [
            {"applicant_name": s.applicant_name, "summary": s.project_summary, "status": s.status, "created_at": _iso(s.created_at)}
            for s in submissions
        ],
        "newsletter": {"subscribed_at": _iso(newsletter.created_at), "confirmed_at": _iso(newsletter.confirmed_at)} if newsletter else None,
    }


async def anonymize_user(db: AsyncSession, user: User, *, reason: str) -> None:
    """
    Effacer l'identité d'un membre (sans commit). Ses sessions sont fermées et il ne peut plus se
    connecter ; son badge QR n'est plus valide. Restent : montants et dates des cotisations
    (comptabilité), projets et messages publiés (signés « Membre supprimé »).
    """
    email = user.email.lower()
    avatar = user.avatar_url

    await db.execute(delete(NewsletterSubscriber).where(NewsletterSubscriber.email.ilike(email)))
    await db.execute(delete(Notification).where(Notification.user_id == user.id))
    await db.execute(delete(PasswordResetToken).where(PasswordResetToken.user_id == user.id))
    # Journal d'audit : les actions restent tracées, mais plus sous l'email du membre
    await db.execute(
        update(AuditLog).where(AuditLog.user_id == user.id).values(user_email=f"supprime-{user.id}@anonyme.invalid")
    )
    # Coordonnées Mobile Money saisies par le membre (le montant et la référence restent)
    payments = (await db.scalars(select(MembershipPayment).where(MembershipPayment.user_id == user.id))).all()
    for payment in payments:
        payment.sender_phone = None

    user.first_name = DELETED_FIRST_NAME
    user.last_name = DELETED_LAST_NAME
    user.email = f"supprime-{user.id}@anonyme.invalid"
    user.phone = None
    user.avatar_url = None
    user.hashed_password = None
    user.oauth_provider = None
    user.oauth_id = None
    user.membership_status = None
    user.must_change_password = False
    user.token_version += 1
    user.badge_token = new_badge_token()
    user.anonymized_at = datetime.now(timezone.utc)

    record_audit(
        db, user_email="système (confidentialité)", action="anonymize", resource_type="member",
        resource_id=user.id, branch_id=user.branch_id, details={"reason": reason},
    )

    if avatar and avatar.startswith("/uploads/"):
        try:
            await get_storage_backend().delete(avatar.removeprefix("/uploads/"))
        except Exception:  # fichier déjà absent ou stockage indisponible : l'URL est effacée de toute façon
            logger.warning("Photo de profil non supprimée : %s", avatar)


async def purge_old_audit_logs(db: AsyncSession) -> int:
    """Supprimer les entrées du journal d'audit plus anciennes que la durée de conservation."""
    if settings.RETENTION_AUDIT_DAYS <= 0:
        return 0
    # created_at est enregistré sans fuseau (UTC)
    limit = datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=settings.RETENTION_AUDIT_DAYS)
    result = await db.execute(delete(AuditLog).where(AuditLog.created_at < limit))
    await db.commit()
    if result.rowcount:
        logger.info("%s entrée(s) du journal d'audit supprimée(s) : durée de conservation dépassée", result.rowcount)
    return result.rowcount or 0


async def anonymize_expired_accounts(db: AsyncSession) -> int:
    """Anonymiser les comptes membres arrivés au terme de leur durée de conservation."""
    now = datetime.now(timezone.utc)
    conditions = []
    if settings.RETENTION_UNVALIDATED_DAYS > 0:
        conditions.append(
            (User.membership_status.in_([MembershipStatus.PENDING, MembershipStatus.REJECTED]))
            & (User.created_at < now - timedelta(days=settings.RETENTION_UNVALIDATED_DAYS))
        )
    if settings.RETENTION_FORMER_MEMBER_DAYS > 0:
        limit = membership_dates.today() - timedelta(days=settings.RETENTION_FORMER_MEMBER_DAYS)
        conditions.append(
            (User.membership_status == MembershipStatus.SUSPENDED)
            & or_(User.paid_until < limit, User.paid_until.is_(None) & (User.created_at < now - timedelta(days=settings.RETENTION_FORMER_MEMBER_DAYS)))
        )
    if not conditions:
        return 0

    expired = (
        await db.scalars(
            select(User).where(User.role == UserRole.MEMBER, User.anonymized_at.is_(None), or_(*conditions))
        )
    ).all()
    for user in expired:
        await anonymize_user(db, user, reason="durée de conservation dépassée")
    await db.commit()
    if expired:
        logger.info("%s compte(s) membre anonymisé(s) : durée de conservation dépassée", len(expired))
    return len(expired)
