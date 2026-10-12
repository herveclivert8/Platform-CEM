"""
Schémas Pydantic pour authentification
"""

from datetime import date

from pydantic import BaseModel, EmailStr, Field, field_validator
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
    role: str  # "SUPER_ADMIN", "BRANCH_ADMIN", "MEMBER"
    branch_id: Optional[int] = None
    branch_name: Optional[str] = None
    # Mot de passe temporaire à remplacer avant d'accéder à l'admin
    must_change_password: bool = False
    # Membres uniquement : "PENDING", "ACTIVE" ou "REJECTED"
    membership_status: Optional[str] = None
    phone: Optional[str] = None
    avatar_url: Optional[str] = None
    # Membres : dernier jour couvert par les cotisations, et accès aux privilèges de l'espace membre
    paid_until: Optional[date] = None
    member_access: bool = False


class LoginResponse(BaseModel):
    """Réponse login avec tokens"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: CurrentUserResponse


class RegisterRequest(BaseModel):
    """Inscription d'un visiteur souhaitant devenir membre d'une antenne"""
    first_name: str = Field(..., min_length=1, max_length=255)
    last_name: str = Field(..., min_length=1, max_length=255)
    email: EmailStr
    # Affiché (aux membres) avec l'email sur les projets publiés par le membre
    phone: str = Field(..., min_length=6, max_length=30)
    password: str = Field(..., min_length=8)
    branch_id: int

    @field_validator("first_name", "last_name", "phone")
    @classmethod
    def strip_required(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Champ obligatoire")
        return v


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
