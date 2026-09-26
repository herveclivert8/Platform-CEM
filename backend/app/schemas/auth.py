"""
Schémas Pydantic pour authentification
"""

from pydantic import BaseModel, EmailStr, Field
from typing import Optional


class LoginRequest(BaseModel):
    """Requête de login"""
    email: EmailStr
    password: str


class CurrentUserResponse(BaseModel):
    """Réponse utilisateur actuel"""
    id: int
    email: str
    first_name: str
    last_name: str
    role: str  # "SUPER_ADMIN", "BRANCH_ADMIN"
    branch_id: Optional[int] = None
    branch_name: Optional[str] = None
    # Mot de passe temporaire à remplacer avant d'accéder à l'admin
    must_change_password: bool = False


class LoginResponse(BaseModel):
    """Réponse login avec tokens"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: CurrentUserResponse


class RefreshTokenRequest(BaseModel):
    """Requête de refresh token"""
    refresh_token: str


class LogoutResponse(BaseModel):
    """Réponse logout"""
    message: str


class ChangePasswordRequest(BaseModel):
    """Changement de mot de passe (utilisateur connecté)"""
    current_password: str
    new_password: str = Field(..., min_length=8)
    confirm_password: str


class ForgotPasswordRequest(BaseModel):
    """Demande de réinitialisation de mot de passe"""
    email: EmailStr


class ForgotPasswordResponse(BaseModel):
    message: str


class ResetPasswordRequest(BaseModel):
    """Réinitialisation de mot de passe via token"""
    token: str
    new_password: str = Field(..., min_length=8)
