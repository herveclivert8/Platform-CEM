"""
Modèle Antenne (Branch)
Représente une antenne du CEM dans un pays/localité
"""

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class BranchStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"


class Branch(Base):
    __tablename__ = "branches"

    id: Mapped[int] = mapped_column(primary_key=True)

    # Identité unique
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    country: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    continent: Mapped[str | None] = mapped_column(String(50), nullable=True)

    # Localisation géographique
    latitude: Mapped[float | None] = mapped_column(Numeric(10, 8), nullable=True)
    longitude: Mapped[float | None] = mapped_column(Numeric(11, 8), nullable=True)

    # Contact & Adresse
    contact_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    contact_phone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    physical_address: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Description & Assets
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    banner_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    # Responsable de l'antenne (Admin d'Antenne)
    manager_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # Statut
    status: Mapped[BranchStatus] = mapped_column(
        Enum(BranchStatus, name="branch_status"),
        default=BranchStatus.ACTIVE,
        nullable=False,
        index=True,
    )

    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # Relations (lazy loading par défaut)
    publications: Mapped[list["Publication"]] = relationship(
        back_populates="branch",
        cascade="all, delete-orphan",
        foreign_keys="Publication.branch_id",
    )

    posts: Mapped[list["Post"]] = relationship(
        back_populates="branch",
        cascade="all, delete-orphan",
        foreign_keys="Post.branch_id",
    )

    statistics: Mapped[list["Statistic"]] = relationship(
        back_populates="branch",
        cascade="all, delete-orphan",
    )

    team_members: Mapped[list["TeamMember"]] = relationship(
        back_populates="branch",
        cascade="all, delete-orphan",
        order_by="TeamMember.position",
    )

    manager: Mapped["User | None"] = relationship(foreign_keys=[manager_id])

    def __repr__(self) -> str:
        return f"<Branch(id={self.id}, name='{self.name}', country='{self.country}')>"
