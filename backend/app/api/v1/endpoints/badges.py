"""
Badges à code QR des membres et des admins.

Le code QR ne contient qu'un lien vers la page publique /verifier/<jeton> (User.badge_token) :
les informations affichées au scan sont relues en base à chaque fois, donc toujours à jour
(nom, antenne, rôle, statut de l'adhésion).

- Membre : badge disponible dès la validation de son adhésion. Au scan : nom, prénom, email et
  « CEM <antenne> ». Adhésion désactivée, refusée ou cotisation échue : « badge non valide », sans
  aucune information.
- Admin d'antenne : badge disponible dès la création du compte. Au scan : nom, prénom et « ADMIN <antenne> ».
- Super Admin : badge affiché à sa connexion. Au scan : nom, prénom et « Superadmin ».
"""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, get_db
from app.core.rate_limit import rate_limit
from app.models.user import User, UserRole
from app.services import membership as membership_dates

router = APIRouter(prefix="/badges", tags=["badges"])


class MyBadge(BaseModel):
    token: str


class BadgeVerification(BaseModel):
    valid: bool
    # Renseignés uniquement pour un badge valide
    role: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    # Membres uniquement
    email: str | None = None
    # « CEM Antananarivo », « ADMIN Antananarivo » ou « Superadmin »
    title: str | None = None


def badge_title(user: User) -> str | None:
    """Mention du badge, ou None si le badge n'est pas (ou plus) valide."""
    branch_name = user.branch.name if user.branch else None
    if user.role == UserRole.SUPER_ADMIN:
        return "Superadmin"
    if user.role == UserRole.BRANCH_ADMIN:
        return f"ADMIN {branch_name}" if branch_name else None
    # Échéance passée : non valide sans attendre la désactivation automatique (vérification horaire)
    if user.has_member_access(membership_dates.today()) and branch_name:
        return f"CEM {branch_name}"
    return None


@router.get("/me", response_model=MyBadge)
async def get_my_badge(user: User = Depends(get_current_user)):
    """Jeton du code QR de l'utilisateur connecté (membre validé, admin ou Super Admin)."""
    if badge_title(user) is None:
        raise HTTPException(status_code=404, detail="Aucun badge : l'adhésion n'est pas validée.")
    return MyBadge(token=user.badge_token)


@router.get(
    "/verify/{token}",
    response_model=BadgeVerification,
    dependencies=[Depends(rate_limit("badge_verify", limit=60, window=60))],
)
async def verify_badge(token: str, db: AsyncSession = Depends(get_db)):
    """Page publique ouverte par le scan d'un code QR : informations lues en direct."""
    user = await db.scalar(select(User).options(selectinload(User.branch)).where(User.badge_token == token))
    if not user:
        raise HTTPException(status_code=404, detail="Badge inconnu.")

    title = badge_title(user)
    if title is None:
        return BadgeVerification(valid=False)
    return BadgeVerification(
        valid=True,
        role=user.role.value,
        first_name=user.first_name,
        last_name=user.last_name,
        email=user.email if user.role == UserRole.MEMBER else None,
        title=title,
    )
