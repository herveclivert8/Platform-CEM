"""
Endpoints d'administration (Super Admin only)
Gestion des admins et statistiques
"""

import secrets
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from sqlalchemy.orm import selectinload
from starlette.concurrency import run_in_threadpool
from typing import Optional

from app.api.deps import get_db, get_current_user
from app.core.email import email_service
from app.core.security import hash_password
from app.models import User, Branch, Publication, Post
from app.models.user import UserRole
from app.core.permissions import verify_super_admin_only
from app.services.audit import record_audit

router = APIRouter(prefix="/super-admin", tags=["admin"])


class AdminCreate(BaseModel):
    """Corps de requête pour la création d'un compte administrateur d'antenne"""
    email: EmailStr
    first_name: str
    last_name: str
    branch_id: int


class AdminRead(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    branch_id: Optional[int] = None
    branch_name: Optional[str] = None
    # Mot de passe temporaire pas encore remplacé
    must_change_password: bool = False
    created_at: datetime


class AdminListResponse(BaseModel):
    items: list[AdminRead]
    total: int
    page: int
    page_size: int
    total_pages: int


class AdminCreated(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    branch_id: int
    # Affiché une seule fois au Super Admin ; l'admin doit le remplacer à sa première connexion
    temporary_password: str
    welcome_email_sent: bool


class GlobalStatistics(BaseModel):
    total_branches: int
    total_publications: int
    total_posts: int
    total_admins: int
    timestamp: datetime


def _admin_read(u: User) -> AdminRead:
    return AdminRead(
        id=u.id,
        email=u.email,
        first_name=u.first_name,
        last_name=u.last_name,
        role=u.role.value,
        branch_id=u.branch_id,
        branch_name=u.branch.name if u.branch else None,
        must_change_password=u.must_change_password,
        created_at=u.created_at,
    )


# ============================================
# GESTION DES ADMINS
# ============================================

@router.get("/admins", response_model=AdminListResponse)
async def list_admins(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Lister tous les administrateurs (super admins + admins d'antenne)
    Accessible: Super Admin only
    """
    await verify_super_admin_only(user)

    query = select(User).options(selectinload(User.branch)).order_by(User.id)
    total = await db.scalar(select(func.count(User.id)))

    offset = (page - 1) * page_size
    query = query.offset(offset).limit(page_size)

    result = await db.execute(query)
    users = result.scalars().all()

    return AdminListResponse(
        items=[_admin_read(u) for u in users],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=(total + page_size - 1) // page_size,
    )


@router.post("/admins", response_model=AdminCreated, status_code=status.HTTP_201_CREATED)
async def create_admin(
    data: AdminCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Créer un compte Admin d'Antenne.
    Accessible: Super Admin only

    Seul le Super Admin peut créer un Admin d'Antenne, rattaché à exactement une antenne.
    """
    await verify_super_admin_only(user)

    query = select(User).where(User.email == data.email)
    if await db.scalar(query):
        raise HTTPException(status_code=400, detail="Un compte existe déjà avec cet email")

    branch = await db.get(Branch, data.branch_id)
    if not branch:
        raise HTTPException(status_code=404, detail="Antenne introuvable")

    # Mot de passe temporaire à communiquer au nouvel admin (à changer à la première connexion)
    temporary_password = secrets.token_urlsafe(12)

    new_user = User(
        email=data.email,
        first_name=data.first_name,
        last_name=data.last_name,
        hashed_password=hash_password(temporary_password),
        role=UserRole.BRANCH_ADMIN,
        branch_id=branch.id,
        must_change_password=True,
    )
    db.add(new_user)
    await db.flush()

    if branch.manager_id is None:
        branch.manager_id = new_user.id

    record_audit(
        db, user=user, action="create", resource_type="user", resource_id=new_user.id,
        branch_id=branch.id, details={"email": new_user.email},
    )
    await db.commit()
    await db.refresh(new_user)

    # smtplib est bloquant : hors de la boucle asynchrone
    email_sent = await run_in_threadpool(
        email_service.send_welcome_email,
        user_email=new_user.email,
        user_name=f"{new_user.first_name} {new_user.last_name}",
    )

    return {
        "id": new_user.id,
        "email": new_user.email,
        "first_name": new_user.first_name,
        "last_name": new_user.last_name,
        "role": new_user.role.value,
        "branch_id": new_user.branch_id,
        "temporary_password": temporary_password,
        "welcome_email_sent": email_sent,
    }


@router.delete("/admins/{admin_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_admin(
    admin_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Supprimer un compte administrateur
    Accessible: Super Admin only
    """
    await verify_super_admin_only(user)

    if admin_id == user.id:
        raise HTTPException(status_code=400, detail="Vous ne pouvez pas supprimer votre propre compte")

    admin = await db.get(User, admin_id)
    if not admin:
        raise HTTPException(status_code=404, detail="Compte introuvable")

    # Détacher l'admin de l'antenne qu'il gère, le cas échéant
    managed_branches = await db.execute(select(Branch).where(Branch.manager_id == admin_id))
    for branch in managed_branches.scalars().all():
        branch.manager_id = None

    record_audit(
        db, user=user, action="delete", resource_type="user", resource_id=admin.id,
        branch_id=admin.branch_id, details={"email": admin.email},
    )
    await db.delete(admin)
    await db.commit()

    return None


# ============================================
# STATISTIQUES
# ============================================

@router.get("/statistics", response_model=GlobalStatistics)
async def get_global_statistics(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Récupérer les statistiques globales
    Accessible: Super Admin only
    """
    await verify_super_admin_only(user)

    total_branches = await db.scalar(select(func.count(Branch.id)))
    total_publications = await db.scalar(select(func.count(Publication.id)))
    total_posts = await db.scalar(select(func.count(Post.id)))
    total_admins = await db.scalar(
        select(func.count(User.id)).where(User.role == UserRole.BRANCH_ADMIN)
    )

    return GlobalStatistics(
        total_branches=total_branches or 0,
        total_publications=total_publications or 0,
        total_posts=total_posts or 0,
        total_admins=total_admins or 0,
        timestamp=datetime.now(timezone.utc),
    )
