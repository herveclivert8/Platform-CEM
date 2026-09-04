"""
Endpoints pour les réglages globaux de l'association (réseaux sociaux, etc.)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.permissions import verify_super_admin_only
from app.models.settings import AssociationSettings
from app.models.user import User
from app.schemas.settings import SocialLinksRead, SocialLinksUpdate

router = APIRouter(prefix="/settings", tags=["settings"])

SETTINGS_ID = 1


async def _get_or_create_settings(db: AsyncSession) -> AssociationSettings:
    settings = await db.get(AssociationSettings, SETTINGS_ID)
    if settings is None:
        settings = AssociationSettings(id=SETTINGS_ID)
        db.add(settings)
        await db.commit()
        await db.refresh(settings)
    return settings


@router.get("/social-links", response_model=SocialLinksRead)
async def get_social_links(db: AsyncSession = Depends(get_db)):
    """Récupérer les URLs des réseaux sociaux. Accessible: Public."""
    return await _get_or_create_settings(db)


@router.put("/social-links", response_model=SocialLinksRead)
async def update_social_links(
    data: SocialLinksUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mettre à jour les URLs des réseaux sociaux. Accessible: Super Admin only."""
    await verify_super_admin_only(user)

    settings = await _get_or_create_settings(db)
    for key, value in data.dict(exclude_unset=True).items():
        setattr(settings, key, value)

    await db.commit()
    await db.refresh(settings)
    return settings
