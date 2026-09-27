from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)

# Code renvoyé (403) tant qu'un mot de passe temporaire n'a pas été remplacé ; le frontend redirige
PASSWORD_CHANGE_REQUIRED = "PASSWORD_CHANGE_REQUIRED"


async def get_user_from_token(db: AsyncSession, token: str, token_type: str) -> User:
    """
    Utilisateur d'un JWT valide du type attendu ("access" ou "refresh"). Refuse les jetons d'un
    compte supprimé ou émis avant la dernière révocation (User.token_version).
    """
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Non authentifié")

    payload = decode_token(token)
    if payload is None or payload.get("type") != token_type:
        raise unauthorized

    result = await db.execute(
        select(User).options(selectinload(User.branch)).where(User.id == int(payload["sub"]))
    )
    user = result.scalar_one_or_none()
    if user is None or payload.get("ver", 0) != user.token_version:
        raise unauthorized

    return user


async def get_current_user_allow_password_change(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Utilisateur connecté, même s'il doit encore remplacer son mot de passe temporaire."""
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Non authentifié")
    return await get_user_from_token(db, credentials.credentials, "access")


async def get_current_user(
    user: User = Depends(get_current_user_allow_password_change),
) -> User:
    if user.must_change_password:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=PASSWORD_CHANGE_REQUIRED)
    return user


async def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Utilisateur connecté, ou None pour un visiteur (routes publiques qu'un admin utilise aussi)."""
    if credentials is None:
        return None
    try:
        user = await get_user_from_token(db, credentials.credentials, "access")
    except HTTPException:
        return None
    return None if user.must_change_password else user


def require_role(allowed_roles: list[str | UserRole]):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        role_values = [r.value if isinstance(r, UserRole) else r for r in allowed_roles]
        if current_user.role.value not in role_values:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
        return current_user

    return role_checker
