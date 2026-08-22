"""
Modèle Post
Actualités / rapports de terrain / projets publiés par une antenne, classés par pilier.
"""

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Pillar(str, enum.Enum):
    EDUCATION = "EDUCATION"
    SOCIAL = "SOCIAL"
    SPORT = "SPORT"
    ENTERPRISE = "ENTERPRISE"


class PostStatus(str, enum.Enum):
    DRAFT = "DRAFT"
    PUBLISHED = "PUBLISHED"


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    pillar: Mapped[Pillar] = mapped_column(
        Enum(Pillar, name="pillar", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    status: Mapped[PostStatus] = mapped_column(
        Enum(PostStatus, name="post_status", values_callable=lambda e: [m.value for m in e]),
        default=PostStatus.DRAFT,
        nullable=False,
        index=True,
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    branch: Mapped["Branch"] = relationship(back_populates="posts")
    author: Mapped["User | None"] = relationship(foreign_keys=[author_id])
    images: Mapped[list["PostImage"]] = relationship(
        back_populates="post", cascade="all, delete-orphan", order_by="PostImage.position"
    )


class PostImage(Base):
    __tablename__ = "post_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(512), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    post: Mapped["Post"] = relationship(back_populates="images")
