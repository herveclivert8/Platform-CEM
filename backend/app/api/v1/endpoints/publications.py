"""
Endpoints pour les publications (bilans/rapports formels par antenne)
RÈGLE CRITIQUE: Isolation stricte par branche!
"""

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func, select

from app.api.deps import get_db, get_current_user
from app.api.scope import like_pattern, resolve_branch_scope
from app.services.audit import record_audit
from app.services.translation import delete_translations, localize_schemas, schedule_translation
from app.models import Branch, Publication, User
from app.schemas.publication import (
    Publication as PublicationSchema,
    PublicationAdminItem,
    PublicationAdminListResponse,
    PublicationCreate,
    PublicationUpdate,
)
from app.core.permissions import verify_branch_access

router = APIRouter(prefix="/branches", tags=["publications"])

# Champs traduits automatiquement en anglais (les admins ne saisissent que le français)
TRANSLATED_FIELDS = ("title", "description")


def _schedule_publication_translation(background_tasks: BackgroundTasks, publication: Publication) -> None:
    schedule_translation(
        background_tasks, "publication", publication.id, {f: getattr(publication, f) for f in TRANSLATED_FIELDS}
    )


# Déclarée avant « /publications/{pub_id} » : sinon « admin » serait lu comme un identifiant
@router.get("/publications/admin", response_model=PublicationAdminListResponse)
async def list_publications_admin(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    branch_id: int | None = Query(None, description="Super Admin : limiter à une antenne"),
    q: str | None = Query(None, max_length=100, description="Recherche dans le titre"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Lister les bilans (les plus récents d'abord), avec le nom de leur antenne.
    Accessible: Admin d'antenne (la sienne) + Super Admin (toutes, ou une seule).
    """
    scope = resolve_branch_scope(user, branch_id)
    filters = []
    if scope is not None:
        filters.append(Publication.branch_id == scope)
    if q and q.strip():
        filters.append(Publication.title.ilike(like_pattern(q), escape="\\"))

    total = await db.scalar(select(func.count(Publication.id)).where(*filters)) or 0
    result = await db.execute(
        select(Publication, Branch.name)
        .join(Branch, Branch.id == Publication.branch_id)
        .where(*filters)
        .order_by(Publication.created_at.desc(), Publication.id.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    )
    items = [
        PublicationAdminItem(**PublicationSchema.model_validate(pub).model_dump(), branch_name=name)
        for pub, name in result.all()
    ]
    return PublicationAdminListResponse(
        items=items, total=total, page=page, page_size=page_size, total_pages=(total + page_size - 1) // page_size
    )


# ============================================
# PUBLICATIONS - CRUD par BRANCH
# ============================================

@router.post("/{branch_id}/publications", response_model=PublicationSchema, status_code=status.HTTP_201_CREATED)
async def create_publication(
    branch_id: int,
    data: PublicationCreate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Créer une publication dans une branche
    Accessible: Admin de la branche + Super Admin

    ISOLATION: Admin ne peut créer que dans sa branche
    """
    # ✅ VÉRIFICATION CRITIQUE D'ISOLATION
    await verify_branch_access(user, branch_id)
    if not await db.get(Branch, branch_id):
        raise HTTPException(status_code=404, detail="Antenne introuvable")

    # Créer la publication (l'auteur devient contributeur)
    publication = Publication(
        branch_id=branch_id,
        contributors=[user],
        **data.model_dump(),
    )
    db.add(publication)
    await db.flush()
    record_audit(
        db, user=user, action="create", resource_type="publication", resource_id=publication.id,
        branch_id=branch_id, details={"title": publication.title},
    )
    await db.commit()
    await db.refresh(publication)
    _schedule_publication_translation(background_tasks, publication)

    return PublicationSchema.model_validate(publication)


@router.put("/publications/{pub_id}", response_model=PublicationSchema)
async def update_publication(
    pub_id: int,
    data: PublicationUpdate,
    background_tasks: BackgroundTasks,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Modifier une publication

    ISOLATION STRICTE: seul l'Admin de la branche concernée (ou le Super Admin) peut modifier.
    """
    query = select(Publication).where(Publication.id == pub_id)
    result = await db.execute(query)
    publication = result.scalar_one_or_none()

    if not publication:
        raise HTTPException(status_code=404, detail="Bilan introuvable")

    # ✅ VÉRIFICATION CRITIQUE D'ISOLATION
    await verify_branch_access(user, publication.branch_id)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(publication, key, value)

    record_audit(
        db, user=user, action="update", resource_type="publication", resource_id=publication.id,
        branch_id=publication.branch_id, details={"title": publication.title, "fields": sorted(update_data)},
    )
    await db.commit()
    await db.refresh(publication)
    _schedule_publication_translation(background_tasks, publication)

    return PublicationSchema.model_validate(publication)


@router.delete("/publications/{pub_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_publication(
    pub_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Supprimer une publication

    ISOLATION STRICTE: seul l'Admin de la branche concernée (ou le Super Admin) peut supprimer.
    """
    query = select(Publication).where(Publication.id == pub_id)
    result = await db.execute(query)
    publication = result.scalar_one_or_none()

    if not publication:
        raise HTTPException(status_code=404, detail="Bilan introuvable")

    # ✅ VÉRIFICATION CRITIQUE D'ISOLATION
    await verify_branch_access(user, publication.branch_id)

    record_audit(
        db, user=user, action="delete", resource_type="publication", resource_id=publication.id,
        branch_id=publication.branch_id, details={"title": publication.title},
    )
    await delete_translations(db, "publication", [publication.id])
    await db.delete(publication)
    await db.commit()

    return None


@router.get("/publications/{pub_id}")
async def get_publication(
    pub_id: int,
    db: AsyncSession = Depends(get_db),
    lang: str | None = Query(None, description="« en » : contenu traduit automatiquement"),
):
    """
    Récupérer une publication
    Accessible: Public
    """
    query = select(Publication).where(Publication.id == pub_id)
    result = await db.execute(query)
    publication = result.scalar_one_or_none()

    if not publication:
        raise HTTPException(status_code=404, detail="Bilan introuvable")

    items = [PublicationSchema.model_validate(publication)]
    [item] = await localize_schemas(db, "publication", items, TRANSLATED_FIELDS, lang)
    return item
