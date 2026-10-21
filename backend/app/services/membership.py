"""
Échéances des cotisations et désactivation automatique des membres en retard.

La cotisation se renouvelle le 30 de chaque mois (le dernier jour en février). Un membre dont la
cotisation n'est pas payée à l'échéance est désactivé (SUSPENDED) le lendemain : il peut encore se
connecter pour payer, mais ne voit que l'interface des visiteurs. Après son paiement, l'admin de
son antenne (ou le Super Admin) le réactive.
"""

import asyncio
import calendar
import logging
from datetime import date, datetime, timezone

from sqlalchemy import or_, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal
from app.models.user import MembershipStatus, User, UserRole

logger = logging.getLogger(__name__)

DUE_DAY = 30
# Vérification périodique des échéances (la désactivation a lieu dans l'heure qui suit minuit UTC)
SWEEP_INTERVAL_SECONDS = 60 * 60


def today() -> date:
    return datetime.now(timezone.utc).date()


def due_date(year: int, month: int) -> date:
    """Échéance d'un mois : le 30, ou le dernier jour du mois s'il en a moins (février)."""
    return date(year, month, min(DUE_DAY, calendar.monthrange(year, month)[1]))


def next_due_after(day: date) -> date:
    """Première échéance strictement après `day` (25 oct. → 30 oct. ; 30 oct. → 30 nov.)."""
    due = due_date(day.year, day.month)
    if due > day:
        return due
    year, month = (day.year + 1, 1) if day.month == 12 else (day.year, day.month + 1)
    return due_date(year, month)


async def suspend_overdue_members(db: AsyncSession) -> int:
    """Désactiver les membres actifs dont la cotisation n'est plus à jour ; renvoie leur nombre."""
    result = await db.execute(
        update(User)
        .where(
            User.role == UserRole.MEMBER,
            User.membership_status == MembershipStatus.ACTIVE,
            or_(User.paid_until.is_(None), User.paid_until < today()),
        )
        .values(membership_status=MembershipStatus.SUSPENDED)
        .execution_options(synchronize_session="fetch")
    )
    await db.commit()
    if result.rowcount:
        logger.info("%s membre(s) désactivé(s) : cotisation non payée à l'échéance", result.rowcount)
    return result.rowcount or 0


async def run_suspension_sweeps() -> None:
    """Tâche de fond lancée au démarrage : vérifie les échéances toutes les heures."""
    while True:
        try:
            # Import local : app.services.privacy dépend de ce module
            from app.services.privacy import anonymize_expired_accounts, purge_old_audit_logs

            async with AsyncSessionLocal() as db:
                await suspend_overdue_members(db)
                # Durées de conservation de la politique de confidentialité
                await anonymize_expired_accounts(db)
                await purge_old_audit_logs(db)
        except Exception:  # base momentanément indisponible : nouvel essai à la prochaine heure
            logger.exception("Vérification des cotisations impossible")
        await asyncio.sleep(SWEEP_INTERVAL_SECONDS)
