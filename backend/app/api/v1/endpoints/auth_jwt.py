"""
Endpoints d'authentification - JWT + gestion du mot de passe
"""

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user_allow_password_change, get_user_from_token
from app.core.config import settings
from app.core.email import email_service
from app.core.rate_limit import rate_limit
from app.services.audit import record_audit
from app.db.session import get_db
from app.core.security import create_token_pair, hash_password, verify_password
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
        must_change_password=user.must_change_password,
    )


def _token_response(user: User) -> LoginResponse:
    access_token, refresh_token = create_token_pair(user)
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer",
        user=_build_current_user_response(user),
    )


async def _get_user_with_branch(db: AsyncSession, user_id: int) -> User | None:
    result = await db.execute(
        select(User).options(selectinload(User.branch)).where(User.id == user_id)
    )
    return result.scalar_one_or_none()


@router.post(
    "/login",
    response_model=LoginResponse,
    status_code=200,
    dependencies=[Depends(rate_limit("login", limit=10, window=15 * 60))],
)
async def login(
    credentials: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Connexion utilisateur - Retourne JWT access token + refresh token"""
    result = await db.execute(
        select(User)
        .options(selectinload(User.branch))
        # Insensible à la casse et aux espaces : navigateurs et téléphones ajoutent souvent une majuscule
        .where(func.lower(User.email) == credentials.email.strip().lower())
    )
    user = result.scalar_one_or_none()

    if not user or not user.hashed_password or not verify_password(
        credentials.password, user.hashed_password
    ):
        record_audit(
            db, user=user, user_email=credentials.email, action="login", resource_type="user",
            resource_id=user.id if user else None, success=False, error_message="Identifiants incorrects",
        )
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email ou mot de passe incorrect",
            headers={"WWW-Authenticate": "Bearer"},
        )

    record_audit(db, user=user, action="login", resource_type="user", resource_id=user.id, branch_id=user.branch_id)
    await db.commit()
    return _token_response(user)


@router.get("/me", response_model=CurrentUserResponse, status_code=200)
async def get_current_user(
    user: User = Depends(get_current_user_allow_password_change),
) -> CurrentUserResponse:
    """Récupérer l'utilisateur actuel"""
    return _build_current_user_response(user)


@router.post("/refresh", response_model=LoginResponse, status_code=200)
async def refresh_token(
    request: RefreshTokenRequest,
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """Rafraîchir le token d'accès (refusé si les sessions ont été révoquées depuis)"""
    user = await get_user_from_token(db, request.refresh_token, "refresh")
    return _token_response(user)


@router.post("/logout", response_model=LogoutResponse, status_code=200)
async def logout(
    user: User = Depends(get_current_user_allow_password_change),
    db: AsyncSession = Depends(get_db),
) -> LogoutResponse:
    """Déconnexion : révoque tous les jetons de l'utilisateur (sur tous ses appareils)"""
    user.token_version += 1
    record_audit(db, user=user, action="logout", resource_type="user", resource_id=user.id, branch_id=user.branch_id)
    await db.commit()
    return LogoutResponse(message="Déconnecté avec succès")


@router.post(
    "/password/change",
    response_model=LoginResponse,
    status_code=200,
    dependencies=[Depends(rate_limit("password_change", limit=10, window=15 * 60))],
)
async def change_password(
    data: ChangePasswordRequest,
    user: User = Depends(get_current_user_allow_password_change),
    db: AsyncSession = Depends(get_db),
) -> LoginResponse:
    """
    Changer son propre mot de passe (y compris un mot de passe temporaire).
    Les autres sessions sont révoquées ; de nouveaux jetons sont renvoyés pour la session en cours.
    """
    if data.new_password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Les mots de passe ne correspondent pas")

    if not user.hashed_password or not verify_password(data.current_password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Mot de passe actuel incorrect")

    if data.new_password == data.current_password:
        raise HTTPException(status_code=400, detail="Le nouveau mot de passe doit être différent de l'actuel")

    user.hashed_password = hash_password(data.new_password)
    user.must_change_password = False
    user.token_version += 1
    record_audit(
        db, user=user, action="password_change", resource_type="user", resource_id=user.id, branch_id=user.branch_id
    )
    await db.commit()

    return _token_response(user)


@router.post(
    "/password/forgot",
    response_model=ForgotPasswordResponse,
    status_code=200,
    dependencies=[Depends(rate_limit("password_forgot", limit=5, window=60 * 60))],
)
async def forgot_password(
    data: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
) -> ForgotPasswordResponse:
    """
    Demander une réinitialisation de mot de passe.
    Réponse générique dans tous les cas pour éviter l'énumération d'emails.
    """
    generic_message = ForgotPasswordResponse(
        message="Si un compte existe pour cet email, un lien de réinitialisation a été envoyé."
    )

    result = await db.execute(select(User).where(func.lower(User.email) == data.email.strip().lower()))
    user = result.scalar_one_or_none()
    if not user:
        return generic_message

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    expires_at = datetime.now(timezone.utc) + timedelta(hours=RESET_TOKEN_EXPIRE_HOURS)

    db.add(PasswordResetToken(user_id=user.id, token_hash=token_hash, expires_at=expires_at))
    await db.commit()

    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={raw_token}"
    # Envoi après la réponse (SMTP lent) : même délai de réponse que l'email existe ou non
    background_tasks.add_task(email_service.send_password_reset, user_email=user.email, reset_link=reset_link)

    return generic_message


@router.post(
    "/password/reset",
    status_code=200,
    dependencies=[Depends(rate_limit("password_reset", limit=10, window=60 * 60))],
)
async def reset_password(
    data: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Réinitialiser le mot de passe à partir du token reçu par email ; révoque toutes les sessions"""
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
    user.must_change_password = False
    user.token_version += 1
    reset_token.used_at = now
    record_audit(
        db, user=user, action="password_reset", resource_type="user", resource_id=user.id, branch_id=user.branch_id
    )
    await db.commit()

    return {"message": "Mot de passe réinitialisé avec succès"}
