import enum
from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Enum, ForeignKey, Integer, String, false, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(str, enum.Enum):
    SUPER_ADMIN = "SUPER_ADMIN"
    BRANCH_ADMIN = "BRANCH_ADMIN"
    # Adhérent inscrit depuis le site : aucun accès au back-office
    MEMBER = "MEMBER"


ADMIN_ROLES = (UserRole.SUPER_ADMIN, UserRole.BRANCH_ADMIN)


class MembershipStatus(str, enum.Enum):
    PENDING = "PENDING"  # Inscrit, en attente de validation par un admin
    ACTIVE = "ACTIVE"
    REJECTED = "REJECTED"
    # Cotisation non payée à l'échéance (le 30) : désactivé automatiquement, réactivé par un admin
    SUSPENDED = "SUSPENDED"


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

    # Antenne gérée par cet utilisateur (antenne d'adhésion pour un MEMBER).
    # NULL pour un SUPER_ADMIN, obligatoire pour un BRANCH_ADMIN.
    branch_id: Mapped[int | None] = mapped_column(
        ForeignKey("branches.id", ondelete="SET NULL"), nullable=True, index=True
    )

    oauth_provider: Mapped[OAuthProvider | None] = mapped_column(
        Enum(OAuthProvider, name="oauth_provider", values_callable=lambda e: [m.value for m in e]), nullable=True
    )
    oauth_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Copiée dans chaque JWT ("ver") ; l'incrémenter invalide tous les jetons déjà émis
    # (déconnexion, changement ou réinitialisation du mot de passe).
    token_version: Mapped[int] = mapped_column(Integer, nullable=False, default=0, server_default="0")
    # Mot de passe temporaire (compte créé par le Super Admin) : à remplacer avant tout accès à l'admin
    must_change_password: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default=false()
    )

    # Membres uniquement (NULL pour un admin)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    membership_status: Mapped[MembershipStatus | None] = mapped_column(
        Enum(MembershipStatus, name="membership_status", values_callable=lambda e: [m.value for m in e]),
        nullable=True,
        index=True,
    )
    # Dernier jour couvert par les cotisations confirmées (un mois par cotisation)
    paid_until: Mapped[date | None] = mapped_column(Date, nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    branch: Mapped["Branch | None"] = relationship(foreign_keys=[branch_id])

    @property
    def is_admin(self) -> bool:
        return self.role in ADMIN_ROLES

    def has_member_access(self, today: date) -> bool:
        """Membre validé et à jour de cotisation : accès aux privilèges de l'espace membre."""
        return (
            self.role == UserRole.MEMBER
            and self.membership_status == MembershipStatus.ACTIVE
            and self.paid_until is not None
            and self.paid_until >= today
        )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"
