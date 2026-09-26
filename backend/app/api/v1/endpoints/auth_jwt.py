"""
Endpoints d'authentification - JWT + gestion du mot de passe
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user as get_authenticated_user
from app.core.config import settings
from app.core.email import email_service
from app.db.session import get_db
from app.core.security import decode_token, create_access_token, create_refresh_token, hash_password, verify_password
from app.models.user import User
from app.models.password_reset_token import PasswordResetToken
from app.schemas.auth import (
    ChangePasswordRequest,
    CurrentUserResponse,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    LoginRequest,
    LoginResponse,
    LogoutResponse,
    MessageResponse,
    RefreshTokenRequest,
    ResetPasswordRequest,
)

router = APIRouter(prefix="/auth", tags=["auth"])

RESET_TOKEN_EXPIRE_HOURS = 1


def _build_current_user_response(user: User) -> CurrentUserResponse:
    """Construire la réponse utilisateur (nécessite user.branch pré-chargé)."""
    return CurrentUserResponse(
        id=user.id,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        role=user.role.value,
        branch_id=user.branch_id,
        branch_name=user.branch.name if user.branch else None,
    )


async def _get_user_with_branch(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(
        select(User).options(selectinload(User.branch)).where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def get_bearer_token(request: Request) -> str:
    """Extraire Bearer token du header Authorization"""
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Non authentifié",
        )
    return auth_header[7:]  # Remove "Bearer " prefix


@router.post("/login", response_model=LoginResponse, status_code=200)
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Connexion utilisateur - Retourne JWT access token + refresh token"""
    result = await db.execute(
        select(User)
        .options(selectinload(User.branch))
        # Case/whitespace-insensitive: browsers and phones often capitalize the first letter.
        .where(func.lower(User.email) == credentials.email.strip().lower())
    )
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not verify_password(
        credentials.password, user.hashed_password
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "email": user.email})

    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=_build_current_user_response(user),
    )


@router.get("/me", response_model=CurrentUserResponse, status_code=200)
async def get_current_user(
    token: str = Depends(get_bearer_token),
    db: AsyncSession = Depends(get_db),
) -> CurrentUserResponse:
    """Récupérer l'utilisateur actuel"""
    payload = decode_token(token)
    if payload.get("type") != "access":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")

    user = await _get_user_with_branch(db, int(payload.get("sub")))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur non trouvé")

    return _build_current_user_response(user)


@router.post("/refresh", response_model=LoginResponse, status_code=200)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Rafraîchir le token d'accès"""
    payload = decode_token(request.refresh_token)
    if payload.get("type") != "refresh":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token invalide")

    user = await _get_user_with_branch(db, int(payload.get("sub")))
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Utilisateur non trouvé")

    access_token = create_access_token(data={"sub": str(user.id), "email": user.email})
    new_refresh_token = create_refresh_token(data={"sub": str(user.id), "email": user.email})

    return LoginResponse(
        access_token=access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
        user=_build_current_user_response(user),
    )


@router.post("/logout", response_model=LogoutResponse, status_code=200)
async def logout(
    token: str = Depends(get_bearer_token),
) -> LogoutResponse:
    """Déconnexion utilisateur (les tokens ne sont pas révoqués côté serveur)"""
    decode_token(token)
    return LogoutResponse(message="Déconnecté avec succès")


@router.post("/password/change", response_model=MessageResponse, status_code=200)
async def change_password(
    data: ChangePasswordRequest,
    user: User = Depends(get_authenticated_user),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Changer son propre mot de passe (utilisateur connecté)"""
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Les mots de passe ne correspondent pas")

    if not user.hashed_password or not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect")

    user.hashed_password = hash_password(data.new_password)
    await db.commit()

    return {"message": "Mot de passe modifié avec succès"}


@router.post("/password/forgot", response_model=ForgotPasswordResponse, status_code=200)
async def forgot_password(
    data: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> ForgotPasswordResponse:
    """
    Demander une réinitialisation de mot de passe.
    Réponse générique dans tous les cas pour éviter l'énumération d'emails.
    """
    generic_message = ForgotPasswordResponse(
        message="Si un compte existe pour cet email, un lien de réinitialisation a été envoyé."
    )

    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user:
        return generic_message

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)

    db.add(PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
    await db.commit()

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
    email_service.send_password_reset(user_email=user.email, reset_link=reset_link)

    return generic_message


@router.post("/password/reset", response_model=MessageResponse, status_code=200)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Réinitialiser le mot de passe à partir du token reçu par email"""
    token_hash = hashlib.sha256(data.token.encode()).hexdigest()

    result = await db.execute(
        select(PasswordResetToken).where(PasswordResetToken.token_hash == token_hash)
    )
    reset_token = result.scalar_one_or_none()

    now = datetime.now(timezone.utc)
    expires_at = reset_token.expires_at if reset_token else None
    if expires_at is not None and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if not reset_token or reset_token.used_at is not None or expires_at < now:
        raise HTTPException(status_code=400, detail="Lien de réinitialisation invalide ou expiré")

    user = await db.get(User, reset_token.user_id)
    if not user:
        raise HTTPException(status_code=400, detail="Lien de réinitialisation invalide ou expiré")

    user.hashed_password = hash_password(data.new_password)
    reset_token.used_at = now
    await db.commit()

    return {"message": "Mot de passe réinitialisé avec succès"}
