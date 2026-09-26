"""
Tableau de bord admin : compteurs calculés en base (exacts quel que soit le volume).
"""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user, get_db
from app.api.scope import resolve_branch_scope
from app.models import Donation, Post, ProjectSubmission, User
from app.models.donation import DonationStatus
from app.models.post import PostStatus
from app.models.project_submission import SubmissionStatus

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


class CurrencyTotal(BaseModel):
    currency: str
    amount: float


class DashboardSummary(BaseModel):
    posts_published: int
    posts_draft: int
    submissions_total: int
    # Dossiers pas encore traités (statut "reçu")
    submissions_new: int
    donations_pending: int
    donations_confirmed: int
    donations_rejected: int
    # Montant des dons confirmés, par devise (la carte est en EUR, le Mobile Money en MGA)
    donations_confirmed_totals: list[CurrencyTotal]


@router.get("/summary", response_model=DashboardSummary)
async def get_dashboard_summary(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    branch_id: int | None = Query(None, description="Super Admin : limiter à une antenne"),
):
    """Accessible: Admin d'antenne (la sienne) + Super Admin (toutes, ou une seule)."""
    scope = resolve_branch_scope(user, branch_id)

    def scoped(model):
        return [model.branch_id == scope] if scope is not None else []

    posts = dict(
        (await db.execute(select(Post.status, func.count(Post.id)).where(*scoped(Post)).group_by(Post.status))).all()
    )
    submissions = dict(
        (
            await db.execute(
                select(ProjectSubmission.status, func.count(ProjectSubmission.id))
                .where(*scoped(ProjectSubmission))
                .group_by(ProjectSubmission.status)
            )
        ).all()
    )
    donations = dict(
        (
            await db.execute(
                select(Donation.status, func.count(Donation.id)).where(*scoped(Donation)).group_by(Donation.status)
            )
        ).all()
    )
    totals = (
        await db.execute(
            select(Donation.currency, func.sum(Donation.amount))
            .where(*scoped(Donation), Donation.status == DonationStatus.CONFIRMED)
            .group_by(Donation.currency)
            .order_by(Donation.currency)
        )
    ).all()

    def count(counts: dict, status) -> int:
        return counts.get(status, 0) or counts.get(getattr(status, "value", status), 0)

    return DashboardSummary(
        posts_published=count(posts, PostStatus.PUBLISHED),
        posts_draft=count(posts, PostStatus.DRAFT),
        submissions_total=sum(submissions.values()),
        submissions_new=count(submissions, SubmissionStatus.RECEIVED.value),
        donations_pending=count(donations, DonationStatus.PENDING),
        donations_confirmed=count(donations, DonationStatus.CONFIRMED),
        donations_rejected=count(donations, DonationStatus.REJECTED),
        donations_confirmed_totals=[CurrencyTotal(currency=c, amount=float(a)) for c, a in totals],
    )
