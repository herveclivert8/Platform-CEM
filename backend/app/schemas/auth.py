"""
Schémas Pydantic pour authentification
"""

from pydantic import BaseModel, ConfigDict, EmailStr, Field
from typing import Optional


class LoginRequest(BaseModel):
    """Requête de login"""
    email: EmailStr
    password: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "email": "admin@cem.mg",
                "password": "SecurePassword123!",
            }
        }
    )


class CurrentUserResponse(BaseModel):
    """Réponse utilisateur actuel"""
    id: int
    email: str
    first_name: str
    last_name: str
    role: str  # "SUPER_ADMIN", "BRANCH_ADMIN"
    branch_id: Optional[int] = None
    branch_name: Optional[str] = None


class LoginResponse(BaseModel):
    """Réponse login avec tokens"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: CurrentUserResponse

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "token_123_1234567890.123",
                "refresh_token": "token_456_1234567890.456",
                "token_type": "bearer",
                "user": {
                    "id": 1,
                    "email": "admin@cem.mg",
                    "first_name": "Admin",
                    "last_name": "User",
                    "role": "BRANCH_ADMIN",
                    "branch_id": 1,
                    "branch_name": "Antananarivo",
                },
            }
        }
    )


class RefreshTokenRequest(BaseModel):
    """Requête de refresh token"""
    refresh_token: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "refresh_token": "token_456_1234567890.456",
            }
        }
    )


class LogoutResponse(BaseModel):
    """Réponse logout"""
    message: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"message": "Déconnecté avec succès"}
        }
    )


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


class MessageResponse(BaseModel):
    """Réponse simple : un message de confirmation"""
    message: str
