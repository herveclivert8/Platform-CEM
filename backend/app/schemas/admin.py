"""Schémas de l'administration (comptes admin, statistiques globales)"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr


class AdminCreate(BaseModel):
    """Corps de requête pour la création d'un compte administrateur d'antenne"""
    email: EmailStr
    first_name: str
    last_name: str
    branch_id: int


class AdminAccount(BaseModel):
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    branch_id: Optional[int] = None
    branch_name: Optional[str] = None
    created_at: datetime


class AdminAccountListResponse(BaseModel):
    items: list[AdminAccount]
    total: int
    page: int
    page_size: int
    total_pages: int


class AdminCreated(BaseModel):
    """Compte créé, avec le mot de passe temporaire à communiquer (affiché une seule fois)"""
    id: int
    email: str
    first_name: str
    last_name: str
    role: str
    branch_id: int
    temporary_password: str
    welcome_email_sent: bool


class GlobalStatistics(BaseModel):
    total_branches: int
    total_publications: int
    total_posts: int
    total_admins: int
    generated_at: datetime
