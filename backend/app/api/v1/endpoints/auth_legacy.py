"""
Endpoints d'authentification - CEM Platform
Gestion sessions, login, logout, refresh tokens
"""

from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_db
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    LoginResponse,
    CurrentUserResponse,
    LogoutResponse,
)

router = APIRouter(tags=["auth"])
security = HTTPBearer()

# Configuration JWT simple (à remplacer par vraie implémentation)
SECRET_KEY = "your-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


@router.post("/login", response_model=LoginResponse, status_code=200)
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """
    Endpoint de connexion
    
    Body:
      - email: str
      - password: str (hashed in production)
    
    Response:
      - access_token: str
      - user: CurrentUserResponse
    """
    # Rechercher l'utilisateur
    result = await db.execute(
        select(User).where(User.email == credentials.email)
    )
    user = result.scalar_one_or_none()

    if not user or not user.verify_password(credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
        )

    # Créer token d'accès (simplifié - implémenter JWT réel)
    access_token = f"token_{user.id}_{datetime.utcnow().timestamp()}"
    
    # Mettre à jour last_login
    user.last_login = datetime.utcnow()
    await db.commit()

    return LoginResponse(
        access_token=access_token,
        user=CurrentUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role.role_type,
            branch_id=user.role.branch_id,
            branch_name=user.role.branch.name if user.role.branch else None,
        ),
    )


@router.get("/me", response_model=CurrentUserResponse, status_code=200)
async def get_current_user(
    credentials: HTTPAuthCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> CurrentUserResponse:
    """
    Récupérer l'utilisateur actuel
    
    Header:
      - Authorization: Bearer <token>
    
    Response:
      - CurrentUserResponse
    """
    # Validation token (simplifié - implémenter JWT réel)
    token = credentials.credentials
    if not token.startswith("token_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )

    try:
        # Extraire user_id du token
        user_id = int(token.split("_")[1])
    except (IndexError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )

    # Chercher l'utilisateur
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur non trouvé",
        )

    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role.role_type,
        branch_id=user.role.branch_id,
        branch_name=user.role.branch.name if user.role.branch else None,
    )


@router.post("/logout", response_model=LogoutResponse, status_code=200)
async def logout(
    credentials: HTTPAuthCredentials = Depends(security),
) -> LogoutResponse:
    """
    Endpoint de déconnexion
    
    Header:
      - Authorization: Bearer <token>
    
    Response:
      - message: "Déconnecté avec succès"
    """
    # Validation basique du token
    token = credentials.credentials
    if not token.startswith("token_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )

    # En production, invalider le token dans Redis/blacklist
    return LogoutResponse(message="Déconnecté avec succès")


@router.post("/refresh", response_model=LoginResponse, status_code=200)
async def refresh_token(
    credentials: HTTPAuthCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """
    Rafraîchir le token d'accès
    
    Header:
      - Authorization: Bearer <token>
    
    Response:
      - access_token: str
      - user: CurrentUserResponse
    """
    # Validation token
    token = credentials.credentials
    if not token.startswith("token_"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )

    try:
        user_id = int(token.split("_")[1])
    except (IndexError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token invalide",
        )

    # Chercher l'utilisateur
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Utilisateur non trouvé",
        )

    # Générer nouveau token
    new_token = f"token_{user.id}_{datetime.utcnow().timestamp()}"

    return LoginResponse(
        access_token=new_token,
        user=CurrentUserResponse(
            id=user.id,
            email=user.email,
            full_name=user.full_name,
            role=user.role.role_type,
            branch_id=user.role.branch_id,
            branch_name=user.role.branch.name if user.role.branch else None,
        ),
    )
