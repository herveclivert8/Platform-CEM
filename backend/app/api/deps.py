from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import decode_token
from app.db.session import get_db
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    unauthorized = HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Non authentifié")

    if credentials is None:
        raise unauthorized

    payload = decode_token(credentials.credentials)
    if payload is None or payload.get("type") != "access":
        raise unauthorized

    user_id = payload.get("sub")
    result = await db.execute(select(User).where(User.id == int(user_id)))
    user = result.scalar_one_or_none()
    if user is None:
        raise unauthorized

    return user


def require_role(allowed_roles: list[str | UserRole]):
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        role_values = [r.value if isinstance(r, UserRole) else r for r in allowed_roles]
        if current_user.role.value not in role_values:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Accès refusé")
        return current_user

    return role_checker
