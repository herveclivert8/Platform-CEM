"""
Schémas Pydantic pour authentification JWT
Production-ready
"""

from pydantic import BaseModel, ConfigDict, EmailStr
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


class RefreshTokenRequest(BaseModel):
    """Requête refresh token"""
    refresh_token: str

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            }
        }
    )


class CurrentUserResponse(BaseModel):
    """Réponse utilisateur actuel"""
    id: int
    email: str
    full_name: str
    role: str  # "member", "contributor", "admin", "super_admin"
    branch_id: Optional[int] = None
    branch_name: Optional[str] = None


class LoginResponse(BaseModel):
    """Réponse login avec JWT tokens"""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    user: CurrentUserResponse

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "id": 1,
                    "email": "admin@cem.mg",
                    "full_name": "Admin User",
                    "role": "admin",
                    "branch_id": 1,
                    "branch_name": "Antananarivo",
                },
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


class TokenResponse(BaseModel):
    """Réponse token refresh"""
    access_token: str
    token_type: str = "bearer"

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
            }
        }
    )
