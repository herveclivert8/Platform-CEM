"""
Logique RBAC (Role-Based Access Control)
Gestion des permissions et vérifications d'accès

Modèle simplifié : chaque utilisateur est soit SUPER_ADMIN (accès global),
soit BRANCH_ADMIN rattaché à exactement une antenne via User.branch_id.
"""

from fastapi import Depends, HTTPException, status

from app.api.deps import get_current_user
from app.models.user import User, UserRole


async def verify_branch_access(user: User, required_branch_id: int) -> None:
    """
    Vérifier que l'utilisateur peut accéder à une branche spécifique.

    Règles:
    - Super Admin: Accès partout
    - Admin Antenne: Accès SEULEMENT à sa branche (User.branch_id)
    - Autre: Accès refusé

    Raises:
        HTTPException: Si l'accès est refusé (403)
    """
    if user.role == UserRole.SUPER_ADMIN:
        return  # ✅ Autorisé

    if user.role == UserRole.BRANCH_ADMIN and user.branch_id == required_branch_id:
        return  # ✅ Autorisé (sa branche)

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Access denied: You can only access your own branch",
    )


async def verify_super_admin_only(user: User) -> None:
    """
    Vérifier que l'utilisateur est super admin.

    Raises:
        HTTPException: Si l'utilisateur n'est pas super admin (403)
    """
    if user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Super admin only",
        )


# ============================================
# Decorators pour endpoints
# ============================================

from functools import wraps

def require_super_admin(func):
    """Décorateur pour exiger super admin"""
    @wraps(func)
    async def wrapper(*args, user: User = Depends(get_current_user), **kwargs):
        await verify_super_admin_only(user)
        return await func(*args, user=user, **kwargs)
    return wrapper


def require_admin(func):
    """Décorateur pour exiger un rôle admin (branche ou super)"""
    @wraps(func)
    async def wrapper(*args, user: User = Depends(get_current_user), **kwargs):
        if user.role not in (UserRole.BRANCH_ADMIN, UserRole.SUPER_ADMIN):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required",
            )
        return await func(*args, user=user, **kwargs)
    return wrapper
