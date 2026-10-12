"""Schémas Pydantic pour les discussions sous les projets."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class CommentCreate(BaseModel):
    body: str = Field(..., min_length=1, max_length=2000)
    # Réponse à un commentaire de premier niveau
    parent_id: Optional[int] = None

    @field_validator("body")
    @classmethod
    def strip_body(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Le commentaire est vide")
        return v


class Comment(BaseModel):
    id: int
    project_id: int
    parent_id: Optional[int] = None
    author_id: int
    author_name: str
    # « Admin » à côté du nom pour les réponses de l'équipe
    author_is_admin: bool
    author_avatar_url: Optional[str] = None
    body: str
    created_at: datetime
    # L'utilisateur connecté peut le supprimer (auteur ou admin)
    can_delete: bool
    replies: list["Comment"] = Field(default_factory=list)
