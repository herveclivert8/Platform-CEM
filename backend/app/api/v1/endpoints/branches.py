"""
Endpoints pour les branches (antennes)
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.api.deps import get_db, get_current_user
from app.models import Branch, Publication, User
from app.schemas.branch import (
    Branch as BranchSchema,
    BranchCreate,
    BranchUpdate,
    BranchWithStats,
    BranchListResponse,
)
from app.core.permissions import verify_super_admin_only

router = APIRouter(prefix="/branches", tags=["branches"])


# ============================================
# PUBLIC ENDPOINTS (Accessible à tous)
# ============================================

@router.get("", response_model=BranchListResponse)
async def list_branches(
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
):
    """
    Récupérer la liste de toutes les branches actives
    Accessible: Public
    """
    # Query
    query = select(Branch).where(Branch.status == "active")
    
    # Pagination
    total = await db.scalar(select(func.count(Branch.id)).where(Branch.status == "active"))
    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)
    
    result = await db.execute(query)
    branches = result.scalars().all()
    
    return BranchListResponse(
        items=[BranchSchema.from_orm(b) for b in branches],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{branch_id}", response_model=BranchWithStats)
async def get_branch(
    branch_id: int,
    db: AsyncSession = Depends(get_db),
):
    """
    Récupérer les détails d'une branche avec statistiques
    Accessible: Public
    """
    # Récupérer la branche
    query = select(Branch).where(Branch.id == branch_id)
    result = await db.execute(query)
    branch = result.scalar_one_or_none()
    
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Compter les publications
    pub_count = await db.scalar(
        select(func.count(Publication.id)).where(Publication.branch_id == branch_id)
    )
    
    response = BranchWithStats.from_orm(branch)
    response.publication_count = pub_count or 0
    return response


@router.get("/{branch_id}/publications")
async def get_branch_publications(
    branch_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Récupérer les publications d'une branche
    Accessible: Public
    """
    # Récupérer la branche
    query = select(Branch).where(Branch.id == branch_id)
    result = await db.execute(query)
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Branch not found")

    # Récupérer les publications de la branche
    pub_query = select(Publication).where(Publication.branch_id == branch_id)

    total = await db.scalar(
        select(func.count(Publication.id)).where(Publication.branch_id == branch_id)
    )
    
    offset = (page - 1) * page_size
    pub_query = pub_query.offset(offset).limit(page_size)
    
    result = await db.execute(pub_query)
    publications = result.scalars().all()
    
    from app.schemas.publication import PublicationListResponse
    return PublicationListResponse(
        items=publications,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


# ============================================
# ADMIN ENDPOINTS (Super Admin only)
# ============================================

@router.post("/admin", response_model=BranchSchema, status_code=status.HTTP_201_CREATED)
async def create_branch(
    data: BranchCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Créer une nouvelle branche
    Accessible: Super Admin only
    """
    await verify_super_admin_only(user)
    
    # Créer la branche
    branch = Branch(**data.dict())
    db.add(branch)
    await db.commit()
    await db.refresh(branch)
    
    return BranchSchema.from_orm(branch)


@router.put("/{branch_id}", response_model=BranchSchema)
async def update_branch(
    branch_id: int,
    data: BranchUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Modifier une branche
    Accessible: Super Admin only
    """
    await verify_super_admin_only(user)
    
    # Récupérer la branche
    query = select(Branch).where(Branch.id == branch_id)
    result = await db.execute(query)
    branch = result.scalar_one_or_none()
    
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    # Modifier
    update_data = data.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(branch, key, value)
    
    await db.commit()
    await db.refresh(branch)
    
    return BranchSchema.from_orm(branch)


@router.delete("/{branch_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_branch(
    branch_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Supprimer une branche (et tous ses données)
    Accessible: Super Admin only
    """
    await verify_super_admin_only(user)
    
    # Récupérer et supprimer
    query = select(Branch).where(Branch.id == branch_id)
    result = await db.execute(query)
    branch = result.scalar_one_or_none()
    
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    
    await db.delete(branch)
    await db.commit()
    
    return None
