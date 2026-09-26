"""
Endpoints pour les publications (bilans/rapports formels par antenne)
RÈGLE CRITIQUE: Isolation stricte par branche!
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.api.deps import get_db, get_current_user
from app.models import Publication, User
from app.schemas.publication import (
    Publication as PublicationSchema,
    PublicationCreate,
    PublicationUpdate,
)
from app.core.permissions import verify_branch_access

router = APIRouter(prefix="/branches", tags=["publications"])


# ============================================
# PUBLICATIONS - CRUD par BRANCH
# ============================================

@router.post("/{branch_id}/publications", response_model=PublicationSchema, status_code=status.HTTP_201_CREATED)
async def create_publication(
    branch_id: int,
    data: PublicationCreate,
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

    # Créer la publication (l'auteur devient contributeur)
    publication = Publication(
        branch_id=branch_id,
        contributors=[user],
        **data.model_dump(),
    )
    db.add(publication)
    await db.commit()
    await db.refresh(publication)

    return PublicationSchema.model_validate(publication)


@router.put("/publications/{pub_id}", response_model=PublicationSchema)
async def update_publication(
    pub_id: int,
    data: PublicationUpdate,
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
        raise HTTPException(status_code=404, detail="Publication introuvable")

    # ✅ VÉRIFICATION CRITIQUE D'ISOLATION
    await verify_branch_access(user, publication.branch_id)

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(publication, key, value)

    await db.commit()
    await db.refresh(publication)

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
        raise HTTPException(status_code=404, detail="Publication introuvable")

    # ✅ VÉRIFICATION CRITIQUE D'ISOLATION
    await verify_branch_access(user, publication.branch_id)

    await db.delete(publication)
    await db.commit()

    return None


@router.get("/publications/{pub_id}")
async def get_publication(
    pub_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Récupérer une publication
    Accessible: Public
    """
    query = select(Publication).where(Publication.id == pub_id)
    result = await db.execute(query)
    publication = result.scalar_one_or_none()

    if not publication:
        raise HTTPException(status_code=404, detail="Publication introuvable")

    return PublicationSchema.model_validate(publication)
