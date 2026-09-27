"""
Page publique « Transparence » : chiffres d'impact consolidés, bilans annuels de toutes les
antennes, et (si le Super Admin l'a activé) les totaux des dons confirmés par année et par devise.
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import extract, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db
from app.models import AssociationSettings, Branch, Donation, Project, Publication
from app.models.branch import BranchStatus
from app.models.donation import DonationStatus
from app.models.project import ProjectPhase, ProjectReviewStatus
from app.services.translation import localize_schemas

router = APIRouter(prefix="/transparency", tags=["transparency"])


class TransparencyReport(BaseModel):
    id: int
    title: str
    description: str
    file_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    created_at: datetime
    branch_id: int
    branch_name: str


class DonationTotal(BaseModel):
    year: Optional[int] = None  # None : toutes années confondues
    currency: str
    amount: float
    count: int


class TransparencyRead(BaseModel):
    branches: int
    countries: int
    achievements: int
    ongoing_projects: int
    beneficiaries: int
    reports: list[TransparencyReport]
    # None : le Super Admin n'a pas choisi de publier les montants
    donations_by_year: Optional[list[DonationTotal]] = None
    donations_total: Optional[list[DonationTotal]] = None


@router.get("", response_model=TransparencyRead)
async def get_transparency(
    db: AsyncSession = Depends(get_db),
    lang: str | None = Query(None, description="« en » : titres des bilans traduits automatiquement"),
):
    """Chiffres consolidés et bilans de tout le réseau. Accessible: Public."""
    active_branch = (Branch.status == BranchStatus.ACTIVE,)
    branches = await db.scalar(select(func.count(Branch.id)).where(*active_branch)) or 0
    countries = await db.scalar(select(func.count(func.distinct(Branch.country))).where(*active_branch)) or 0

    approved = (Project.review_status == ProjectReviewStatus.APPROVED) & Project.is_visible.is_(True)
    achievements = await db.scalar(
        select(func.count(Project.id)).where(approved, Project.phase == ProjectPhase.COMPLETED)
    ) or 0
    ongoing = await db.scalar(select(func.count(Project.id)).where(approved, Project.phase == ProjectPhase.ONGOING)) or 0
    beneficiaries = await db.scalar(
        select(func.coalesce(func.sum(Project.beneficiaries_count), 0)).where(approved, Project.phase == ProjectPhase.COMPLETED)
    ) or 0

    # Bilans de toutes les antennes ouvertes, les plus récents d'abord
    rows = await db.execute(
        select(Publication, Branch.name)
        .join(Branch, Branch.id == Publication.branch_id)
        .where(Branch.status != BranchStatus.PENDING)
        .order_by(Publication.created_at.desc(), Publication.id.desc())
    )
    reports = [
        TransparencyReport(
            id=pub.id, title=pub.title, description=pub.description, file_url=pub.file_url,
            thumbnail_url=pub.thumbnail_url, created_at=pub.created_at, branch_id=pub.branch_id,
            branch_name=name,
        )
        for pub, name in rows.all()
    ]
    reports = await localize_schemas(db, "publication", reports, ("title", "description"), lang or "")

    result = TransparencyRead(
        branches=branches, countries=countries, achievements=achievements,
        ongoing_projects=ongoing, beneficiaries=int(beneficiaries), reports=reports,
    )

    settings = await db.get(AssociationSettings, 1)
    if settings and settings.show_donation_totals:
        confirmed = Donation.status == DonationStatus.CONFIRMED
        year = extract("year", Donation.created_at)
        by_year = await db.execute(
            select(year, Donation.currency, func.sum(Donation.amount), func.count(Donation.id))
            .where(confirmed)
            .group_by(year, Donation.currency)
            .order_by(year.desc(), Donation.currency)
        )
        result.donations_by_year = [
            DonationTotal(year=int(y), currency=c, amount=float(a or 0), count=n) for y, c, a, n in by_year.all()
        ]
        totals = await db.execute(
            select(Donation.currency, func.sum(Donation.amount), func.count(Donation.id))
            .where(confirmed)
            .group_by(Donation.currency)
            .order_by(Donation.currency)
        )
        result.donations_total = [DonationTotal(currency=c, amount=float(a or 0), count=n) for c, a, n in totals.all()]

    return result
