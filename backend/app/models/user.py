import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    BRANCH_ADMIN = "BRANCH_ADMIN"


class OAuthProvider(str, enum.Enum):
    GOOGLE = "google"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str | None] = mapped_column(String(255), nullable=True)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", values_callable=lambda e: [m.value for m in e]),
        default=UserRole.BRANCH_ADMIN,
        nullable=False,
    )

    # Antenne gérée par cet utilisateur. NULL pour un SUPER_ADMIN, obligatoire pour un BRANCH_ADMIN.
    branch_id: Mapped[int | None] = mapped_column(
        ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True
    )

    oauth_provider: Mapped[OAuthProvider | None] = mapped_column(
        Enum(OAuthProvider, name="oauth_provider", values_callable=lambda e: [m.value for m in e]), nullable=True
    )
    oauth_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    branch: Mapped["Branch | None"] = relationship(foreign_keys=[branch_id])

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
