"""
Endpoints pour les réglages globaux de l'association (réseaux sociaux, coordonnées de paiement,
couverture de la page d'accueil)
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.permissions import verify_super_admin_only
from app.services.audit import record_audit
from app.models.settings import AssociationSettings
from app.models.user import User
from app.schemas.settings import (
    HomeHeroRead,
    HomeHeroUpdate,
    PaymentInfoRead,
    PaymentInfoUpdate,
    SocialLinksRead,
    SocialLinksUpdate,
)

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
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(settings, key, value)

    record_audit(
        db, user=user, action="update", resource_type="settings",
        details={"section": "social_links", "fields": sorted(data.model_fields_set)},
    )
    await db.commit()
    await db.refresh(settings)
    return settings


@router.get("/payment-info", response_model=PaymentInfoRead)
async def get_payment_info(db: AsyncSession = Depends(get_db)):
    """Récupérer le RIB et les numéros Mobile Money pour les dons. Accessible: Public."""
    return await _get_or_create_settings(db)


@router.put("/payment-info", response_model=PaymentInfoRead)
async def update_payment_info(
    data: PaymentInfoUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mettre à jour le RIB et les numéros Mobile Money. Accessible: Super Admin only."""
    await verify_super_admin_only(user)

    settings = await _get_or_create_settings(db)
    for key, value in data.model_dump(exclude_unset=True).items():
        # Un champ vidé dans le formulaire est stocké à NULL (= non affiché)
        setattr(settings, key, value.strip() if isinstance(value, str) and value.strip() else None)

    record_audit(
        db, user=user, action="update", resource_type="settings",
        details={"section": "payment_info", "fields": sorted(data.model_fields_set)},
    )
    await db.commit()
    await db.refresh(settings)
    return settings


@router.get("/home-hero", response_model=HomeHeroRead)
async def get_home_hero(db: AsyncSession = Depends(get_db)):
    """Récupérer la couverture personnalisée de la page d'accueil. Accessible: Public."""
    return await _get_or_create_settings(db)


@router.put("/home-hero", response_model=HomeHeroRead)
async def update_home_hero(
    data: HomeHeroUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Modifier la photo et les textes de couverture. Accessible: Super Admin only."""
    await verify_super_admin_only(user)

    settings = await _get_or_create_settings(db)
    for key, value in data.model_dump(exclude_unset=True).items():
        # Un champ vidé revient à la valeur par défaut du site
        setattr(settings, key, value.strip() if isinstance(value, str) and value.strip() else None)

    record_audit(
        db, user=user, action="update", resource_type="settings",
        details={"section": "home_hero", "fields": sorted(data.model_fields_set)},
    )
    await db.commit()
    await db.refresh(settings)
    return settings
