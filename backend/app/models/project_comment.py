"""
Modèle ProjectComment
Discussion sous un projet publié, réservée aux membres à jour de cotisation et aux admins.
Un commentaire peut répondre à un autre (un seul niveau de réponses, comme sous une publication Facebook).
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class ProjectComment(Base):
    __tablename__ = "project_comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    # Commentaire auquel celui-ci répond (toujours un commentaire de premier niveau)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("project_comments.id", ondelete="CASCADE"), nullable=True, index=True
    )
    body: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    author: Mapped["User"] = relationship()
