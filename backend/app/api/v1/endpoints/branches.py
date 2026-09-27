"""
Endpoints pour les branches (antennes)
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlalchemy import select, func

from app.api.deps import get_db, get_current_user, get_optional_user
from app.models import Branch, Publication, TeamMember, User
from app.models.branch import BranchStatus
from app.models.user import UserRole
from app.schemas.branch import (
    Branch as BranchSchema,
    BranchCreate,
    BranchUpdate,
    BranchWithStats,
    BranchListResponse,
    BranchManagerRead,
)
from app.core.permissions import can_access_branch, verify_super_admin_only, verify_branch_access
from app.services.audit import record_audit
from app.services.geocoding import fill_missing_coordinates

router = APIRouter(prefix="/branches", tags=["branches"])

# Champs du profil qu'un admin d'antenne peut modifier ; le reste (nom, pays, position, statut...)
# est réservé au Super Admin.
BRANCH_ADMIN_EDITABLE_FIELDS = {
    "description",
    "logo_url",
    "banner_url",
    "contact_name",
    "contact_email",
    "contact_phone",
    "physical_address",
    "team_members",
}


# ============================================
# PUBLIC ENDPOINTS (Accessible à tous)
# ============================================

@router.get("", response_model=BranchListResponse)
async def list_branches(
    db: AsyncSession = Depends(get_db),
    user: User | None = Depends(get_optional_user),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=500),
    include_inactive: bool = Query(False, description="Super Admin : inclure les antennes inactives / en attente"),
):
    """
    Récupérer la liste des branches actives (toutes pour le Super Admin avec include_inactive).
    Accessible: Public
    """
    filters = []
    if not (include_inactive and user is not None and user.role == UserRole.SUPER_ADMIN):
        filters.append(Branch.status == "active")

    total = await db.scalar(select(func.count(Branch.id)).where(*filters))
    offset = (page - 1) * page_size
    query = select(Branch).where(*filters).order_by(Branch.name, Branch.id).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    branches = result.scalars().all()
    
    return BranchListResponse(
        items=[BranchSchema.model_validate(b) for b in branches],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.get("/{branch_id}", response_model=BranchWithStats)
async def get_branch(
    branch_id: int,
    user: User | None = Depends(get_optional_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Récupérer les détails d'une branche avec statistiques, responsable et équipe
    Accessible: Public
    """
    # Récupérer la branche (avec responsable et équipe pour l'aperçu de l'annuaire)
    query = (
        select(Branch)
        .options(selectinload(Branch.manager), selectinload(Branch.team_members))
        .where(Branch.id == branch_id)
    )
    result = await db.execute(query)
    branch = result.scalar_one_or_none()

    # Une antenne en attente n'est pas encore ouverte : invisible pour le public
    if not branch or (branch.status == BranchStatus.PENDING and not can_access_branch(user, branch_id)):
        raise HTTPException(status_code=404, detail="Antenne introuvable")

    # Compter les publications
    pub_count = await db.scalar(
        select(func.count(Publication.id)).where(Publication.branch_id == branch_id)
    )

    response = BranchWithStats.model_validate(branch)
    response.publication_count = pub_count or 0
    response.manager = BranchManagerRead.model_validate(branch.manager) if branch.manager else None
    return response


@router.get("/{branch_id}/publications")
async def get_branch_publications(
    branch_id: int,
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    lang: str | None = Query(None, description="« en » : titres et descriptions traduits automatiquement"),
):
    """
    Récupérer les publications d'une branche
    Accessible: Public
    """
    # Récupérer la branche
    branch = await db.get(Branch, branch_id)
    if not branch or branch.status == BranchStatus.PENDING:
        raise HTTPException(status_code=404, detail="Antenne introuvable")

    # Récupérer les publications de la branche (les plus récentes d'abord)
    pub_query = (
        select(Publication)
        .where(Publication.branch_id == branch_id)
        .order_by(Publication.created_at.desc(), Publication.id.desc())
    )

    total = await db.scalar(
        select(func.count(Publication.id)).where(Publication.branch_id == branch_id)
    )
    
    offset = (page - 1) * page_size
    pub_query = pub_query.offset(offset).limit(page_size)
    
    result = await db.execute(pub_query)
    publications = result.scalars().all()
    
    from app.schemas.publication import Publication as PublicationSchema, PublicationListResponse
    from app.services.translation import localize_schemas

    items = [PublicationSchema.model_validate(p) for p in publications]
    return PublicationListResponse(
        items=await localize_schemas(db, "publication", items, ("title", "description"), lang),
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
    branch_data = data.model_dump(exclude={"team_members"})
    branch = Branch(
        **branch_data,
        team_members=[
            TeamMember(name=m.name, role=m.role, photo_url=m.photo_url, position=i)
            for i, m in enumerate(data.team_members)
        ],
    )
    # Ville saisie à la main (pas via l'autocomplétion) : on calcule la position pour la carte
    await fill_missing_coordinates(branch)
    db.add(branch)
    await db.flush()
    record_audit(
        db, user=user, action="create", resource_type="branch", resource_id=branch.id,
        branch_id=branch.id, details={"name": branch.name},
    )
    await db.commit()
    await db.refresh(branch)

    return BranchSchema.model_validate(branch)


@router.put("/{branch_id}", response_model=BranchSchema)
async def update_branch(
    branch_id: int,
    data: BranchUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Modifier une branche
    Accessible: Super Admin, ou Admin de cette antenne (profil : photo, adresse,
    contact, résumé, équipe)
    """
    await verify_branch_access(user, branch_id)

    if user.role != UserRole.SUPER_ADMIN:
        forbidden = sorted(data.model_fields_set - BRANCH_ADMIN_EDITABLE_FIELDS)
        if forbidden:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Seul le Super Admin peut modifier : {', '.join(forbidden)}",
            )

    # Récupérer la branche
    query = (
        select(Branch)
        .options(selectinload(Branch.team_members))
        .where(Branch.id == branch_id)
    )
    result = await db.execute(query)
    branch = result.scalar_one_or_none()

    if not branch:
        raise HTTPException(status_code=404, detail="Antenne introuvable")

    # Modifier
    previous_place = (branch.name, branch.country)
    update_data = data.model_dump(exclude_unset=True, exclude={"team_members"})
    for key, value in update_data.items():
        setattr(branch, key, value)

    # Ville / pays réellement changés sans nouvelle position fournie : l'ancienne position est fausse
    place_changed = (branch.name, branch.country) != previous_place
    if place_changed and not {"latitude", "longitude"} & data.model_fields_set:
        branch.latitude = branch.longitude = None
    await fill_missing_coordinates(branch)  # sans position (ou position effacée) : calculée pour la carte

    if data.team_members is not None:
        branch.team_members.clear()
        for i, m in enumerate(data.team_members):
            branch.team_members.append(
                TeamMember(name=m.name, role=m.role, photo_url=m.photo_url, position=i)
            )

    record_audit(
        db, user=user, action="update", resource_type="branch", resource_id=branch.id,
        branch_id=branch.id, details={"name": branch.name, "fields": sorted(data.model_fields_set)},
    )
    await db.commit()
    await db.refresh(branch)

    return BranchSchema.model_validate(branch)


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
        raise HTTPException(status_code=404, detail="Antenne introuvable")

    # Ses admins resteraient sans antenne (connectés mais sans accès à rien)
    admin_count = await db.scalar(select(func.count(User.id)).where(User.branch_id == branch_id))
    if admin_count:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cette antenne a encore {admin_count} admin(s) rattaché(s). "
            "Supprimez ou réaffectez ces comptes avant de supprimer l'antenne.",
        )

    record_audit(
        db, user=user, action="delete", resource_type="branch", resource_id=branch.id,
        details={"name": branch.name},
    )
    await db.delete(branch)
    await db.commit()
    
    return None
