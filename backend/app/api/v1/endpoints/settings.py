"""
Endpoints pour les réglages globaux de l'association (réseaux sociaux, coordonnées de paiement,
page d'accueil : couverture, « Nos valeurs », contact)
"""

from fastapi import APIRouter, BackgroundTasks, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user
from app.core.permissions import verify_super_admin_only
from app.services.audit import record_audit
from app.services.translation import localize, normalize_lang, schedule_translation
from app.models.settings import AssociationSettings
from app.models.user import User
from app.schemas.settings import (
    HomeHeroRead,
    HomeHeroUpdate,
    HomePageRead,
    HomePageUpdate,
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


# Page d'accueil : champs du modèle (saisis en français) exposés sous un nom sans suffixe de langue
HOME_TEXT_FIELDS = {
    "hero_badge": "hero_badge_fr",
    "hero_title": "hero_title_fr",
    "hero_subtitle": "hero_subtitle_fr",
    "contact_address": "contact_address",
    "map_subtitle": "map_subtitle",
}


def _home_sources(settings: AssociationSettings) -> dict[str, str | None]:
    """Textes français à traduire : les champs de texte, plus chaque valeur (« values.0 », ...)."""
    sources = {field: getattr(settings, column) for field, column in HOME_TEXT_FIELDS.items()}
    for i, value in enumerate(settings.home_values or []):
        sources[f"values.{i}"] = value
    return sources


@router.get("/home-page", response_model=HomePageRead)
async def get_home_page(
    db: AsyncSession = Depends(get_db),
    lang: str | None = Query(None, description="« en » : textes traduits automatiquement"),
):
    """Couverture, « Nos valeurs » et contact de la page d'accueil. Accessible: Public."""
    settings = await _get_or_create_settings(db)
    sources = _home_sources(settings)
    translated = (await localize(db, "home", {SETTINGS_ID: sources}, lang or "")).get(SETTINGS_ID, {})
    text = lambda field: translated.get(field) or sources.get(field)  # noqa: E731
    return HomePageRead(
        hero_image_url=settings.hero_image_url,
        **{field: text(field) for field in HOME_TEXT_FIELDS},
        values=[text(f"values.{i}") for i in range(len(settings.home_values))] if settings.home_values else None,
        contact_email=settings.contact_email,
        contact_phone=settings.contact_phone,
        show_donation_totals=settings.show_donation_totals,
        lang=normalize_lang(lang),
    )


@router.put("/home-page", response_model=HomePageRead)
async def update_home_page(
    data: HomePageUpdate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Modifier la page d'accueil, en français. L'anglais est traduit automatiquement en arrière-plan.
    Accessible: Super Admin only.
    """
    await verify_super_admin_only(user)

    settings = await _get_or_create_settings(db)
    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "show_donation_totals" and value is None:
            continue  # colonne non nulle : « null » ne signifie rien ici
        column = HOME_TEXT_FIELDS.get(field) or {"values": "home_values"}.get(field, field)
        if isinstance(value, str):
            value = value.strip() or None  # un champ vidé revient au contenu par défaut du site
        setattr(settings, column, value)

    record_audit(
        db, user=user, action="update", resource_type="settings",
        details={"section": "home_page", "fields": sorted(data.model_fields_set)},
    )
    await db.commit()
    await db.refresh(settings)
    schedule_translation(background_tasks, "home", SETTINGS_ID, _home_sources(settings))
    return await get_home_page(db, "fr")
