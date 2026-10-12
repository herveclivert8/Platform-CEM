"""
Publication automatique sur les réseaux sociaux : état de la configuration et historique.
Accessible: Super Admin uniquement (les identifiants des réseaux se règlent côté serveur, dans .env).
"""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_admin, get_db
from app.core.permissions import verify_super_admin_only
from app.models import SocialPublication, User
from app.services.audit import record_audit
from app.services.social import NETWORK_LABELS, network_configured, publishing_mode, retry_publication

router = APIRouter(prefix="/social", tags=["social"])


class NetworkStatus(BaseModel):
    network: str
    label: str
    configured: bool


class SocialStatus(BaseModel):
    # "simulation", "live" ou "disabled"
    mode: str
    networks: list[NetworkStatus]


class SocialPublicationSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    resource_type: str
    resource_id: int
    network: str
    status: str
    title: str
    message: str
    external_url: Optional[str] = None
    error: Optional[str] = None
    simulated: bool
    created_at: datetime
    updated_at: datetime


class SocialPublicationList(BaseModel):
    items: list[SocialPublicationSchema]
    total: int
    page: int
    page_size: int
    total_pages: int


@router.get("/status", response_model=SocialStatus)
async def get_status(user: User = Depends(get_current_admin)):
    """Mode de publication et réseaux configurés sur le serveur."""
    await verify_super_admin_only(user)
    return SocialStatus(
        mode=publishing_mode(),
        networks=[
            NetworkStatus(network=n, label=label, configured=network_configured(n)) for n, label in NETWORK_LABELS.items()
        ],
    )


@router.get("/publications", response_model=SocialPublicationList)
async def list_publications(
    user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db),
    status: Optional[str] = Query(None, pattern="^(PUBLISHED|FAILED|SKIPPED)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(30, ge=1, le=100),
):
    """Historique des publications, les plus récentes d'abord."""
    await verify_super_admin_only(user)
    filters = [SocialPublication.status == status] if status else []
    total = await db.scalar(select(func.count(SocialPublication.id)).where(*filters)) or 0
    result = await db.execute(
        select(SocialPublication)
        .where(*filters)
        .order_by(SocialPublication.created_at.desc(), SocialPublication.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    return SocialPublicationList(
        items=[SocialPublicationSchema.model_validate(p) for p in result.scalars().all()],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("/publications/{publication_id}/retry", response_model=SocialPublicationSchema)
async def retry(publication_id: int, user: User = Depends(get_current_admin), db: AsyncSession = Depends(get_db)):
    """Réessayer une publication en échec (ou non configurée au moment du partage)."""
    await verify_super_admin_only(user)
    publication = await db.get(SocialPublication, publication_id)
    if not publication:
        raise HTTPException(status_code=404, detail="Publication introuvable")
    if publication.status == "PUBLISHED":
        raise HTTPException(status_code=400, detail="Ce contenu est déjà publié sur ce réseau.")
    if publishing_mode() == "disabled":
        raise HTTPException(status_code=400, detail="La publication sur les réseaux sociaux est désactivée.")
    record_audit(
        db, user=user, action="retry", resource_type="social_publication", resource_id=publication.id,
        details={"network": publication.network, "title": publication.title},
    )
    return SocialPublicationSchema.model_validate(await retry_publication(db, publication))
