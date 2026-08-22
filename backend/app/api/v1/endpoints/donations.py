"""
Endpoints pour les dons.

Remarque: seul l'enregistrement du don est implémenté ici. L'intégration avec un
prestataire de paiement (Stripe, PayPal, ...) n'est pas spécifiée et reste à définir.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.deps import get_db, get_current_user
from app.models import Branch, Donation, User
from app.models.user import UserRole
from app.schemas.donation import Donation as DonationSchema, DonationCreate, DonationListResponse

router = APIRouter(prefix="/donations", tags=["donations"])


@router.post("", response_model=DonationSchema, status_code=201)
async def create_donation(
    data: DonationCreate,
    db: AsyncSession = Depends(get_db),
):
    """Enregistrer un don. Accessible: Public."""
    if data.branch_id is not None and not await db.get(Branch, data.branch_id):
        raise HTTPException(status_code=404, detail="Branch not found")

    donation = Donation(**data.dict())
    db.add(donation)
    await db.commit()
    await db.refresh(donation)

    return DonationSchema.from_orm(donation)


@router.get("", response_model=DonationListResponse)
async def list_donations(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Lister les dons.
    Accessible: Admin de la branche (ses dons) + Super Admin (tous les dons).
    """
    filters = []
    if user.role == UserRole.BRANCH_ADMIN:
        filters.append(Donation.branch_id == user.branch_id)

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
        items=[DonationSchema.from_orm(d) for d in donations],
        total=total or 0,
        page=page,
        page_size=page_size,
        total_pages=((total or 0) + page_size - 1) // page_size,
    )
