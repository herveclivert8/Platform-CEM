"""
Schémas Pydantic pour les posts (actualités / rapports de terrain / projets par pilier)
"""

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class Pillar(str, Enum):
    EDUCATION = "EDUCATION"
    SOCIAL = "SOCIAL"
    SPORT = "SPORT"
    ENTERPRISE = "ENTERPRISE"


class PostStatus(str, Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"


class PostImage(BaseModel):
    url: str

    model_config = ConfigDict(from_attributes=True)


class PostBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    content: str = Field(..., min_length=1)
    pillar: Pillar
    status: PostStatus = PostStatus.DRAFT


class PostCreate(PostBase):
    images: list[str] = Field(default_factory=list)


class PostUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    pillar: Optional[Pillar] = None
    status: Optional[PostStatus] = None
    images: Optional[list[str]] = None


class Post(PostBase):
    id: int
    branch_id: int
    author_id: Optional[int] = None
    images: list[str] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm_post(cls, post) -> "Post":
        pillar = post.pillar.value if hasattr(post.pillar, "value") else post.pillar
        status = post.status.value if hasattr(post.status, "value") else post.status
        return cls(
            id=post.id,
            branch_id=post.branch_id,
            author_id=post.author_id,
            title=post.title,
            content=post.content,
            pillar=pillar,
            status=status,
            images=[img.url for img in post.images],
            created_at=post.created_at,
            updated_at=post.updated_at,
        )


class PostListResponse(BaseModel):
    items: list[Post]
    total: int
    page: int
    page_size: int
    total_pages: int
