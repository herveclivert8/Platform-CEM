"""Portée des listes admin : un admin d'antenne ne voit que son antenne, le Super Admin choisit."""

from fastapi import HTTPException, status

from app.models.user import User, UserRole


def resolve_branch_scope(user: User, branch_id: int | None) -> int | None:
    """
    Antenne à laquelle limiter une liste admin, ou None pour toutes (Super Admin uniquement).
    Un admin d'antenne est toujours limité à la sienne.
    """
    if user.role == UserRole.SUPER_ADMIN:
        return branch_id
    if user.branch_id is None or (branch_id is not None and branch_id != user.branch_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé : vous ne pouvez gérer que votre antenne",
        )
    return user.branch_id


def like_pattern(search: str) -> str:
    """Motif ILIKE « contient », avec les caractères spéciaux échappés."""
    escaped = search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"
