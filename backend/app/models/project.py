"""
Modèle Project
Projets d'une antenne : « Projets en cours » (phase ONGOING) puis « Nos réalisations »
(phase COMPLETED). Contrairement aux posts, toute publication par un Admin d'antenne
passe par une validation du Super Admin (review_status).
"""

import enum
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.post import Pillar


class ProjectPhase(str, enum.Enum):
    ONGOING = "ONGOING"
    COMPLETED = "COMPLETED"


class ProjectReviewStatus(str, enum.Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(String(500), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    pillar: Mapped[Pillar] = mapped_column(
        Enum(Pillar, name="pillar", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
    )
    beneficiaries: Mapped[str] = mapped_column(String(255), nullable=False)
    beneficiaries_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    end_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    phase: Mapped[ProjectPhase] = mapped_column(
        Enum(ProjectPhase, name="project_phase", values_callable=lambda e: [m.value for m in e]),
        nullable=False,
        index=True,
    )
    review_status: Mapped[ProjectReviewStatus] = mapped_column(
        Enum(ProjectReviewStatus, name="project_review_status", values_callable=lambda e: [m.value for m in e]),
        default=ProjectReviewStatus.PENDING,
        nullable=False,
        index=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    branch: Mapped["Branch"] = relationship()
    author: Mapped["User | None"] = relationship(foreign_keys=[author_id])
    reviewed_by: Mapped["User | None"] = relationship(foreign_keys=[reviewed_by_id])
    images: Mapped[list["ProjectImage"]] = relationship(
        back_populates="project", cascade="all, delete-orphan", order_by="ProjectImage.position"
    )


class ProjectImage(Base):
    __tablename__ = "project_images"

    id: Mapped[int] = mapped_column(primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True)
    url: Mapped[str] = mapped_column(String(512), nullable=False)
    position: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    project: Mapped["Project"] = relationship(back_populates="images")
