"""
Modèle OpportunityApplication
Candidature d'un membre à une opportunité du Club (aujourd'hui : poursuite d'études en Italie).
Réservée aux membres validés rattachés à une antenne ; consultée par le Super Admin seulement.
Les fichiers joints (CV, projet de Master ou de Doctorat, dossier de financement…) sont stockés en
base, comme les documents de projet : jamais accessibles par un lien direct, ils sont servis par
l'API au Super Admin.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, Text, func
from sqlalchemy.orm import Mapped, deferred, mapped_column, relationship

from app.db.base import Base

PROGRAM_ITALY = "ITALY_STUDIES"

MAX_APPLICATION_FILES = 5

STATUS_NEW = "NEW"
STATUS_IN_REVIEW = "IN_REVIEW"
STATUS_ACCEPTED = "ACCEPTED"
STATUS_REJECTED = "REJECTED"
OPEN_STATUSES = (STATUS_NEW, STATUS_IN_REVIEW)


class OpportunityApplication(Base):
    __tablename__ = "opportunity_applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    program: Mapped[str] = mapped_column(String(30), nullable=False, default=PROGRAM_ITALY, index=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)

    # Saisis dans le formulaire (copie au moment de la candidature)
    last_name: Mapped[str] = mapped_column(String(255), nullable=False)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    member_number: Mapped[str] = mapped_column(String(16), nullable=False)
    branch_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(50), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    study_level: Mapped[str] = mapped_column(String(100), nullable=False)
    faculty: Mapped[str] = mapped_column(String(255), nullable=False)
    major: Mapped[str] = mapped_column(String(255), nullable=False)  # mention
    motivation: Mapped[str] = mapped_column(Text, nullable=False)  # 5 lignes maximum

    status: Mapped[str] = mapped_column(String(20), nullable=False, default=STATUS_NEW, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    files: Mapped[list["OpportunityApplicationFile"]] = relationship(
        back_populates="application",
        cascade="all, delete-orphan",
        passive_deletes=True,
        order_by="OpportunityApplicationFile.position",
        lazy="selectin",
    )


class OpportunityApplicationFile(Base):
    """Fichier joint à une candidature (PDF, Word, Excel ou PowerPoint, 10 Mo maximum)."""

    __tablename__ = "opportunity_application_files"

    id: Mapped[int] = mapped_column(primary_key=True)
    application_id: Mapped[int] = mapped_column(
        ForeignKey("opportunity_applications.id", ondelete="CASCADE"), nullable=False, index=True
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    content_type: Mapped[str] = mapped_column(String(150), nullable=False)
    size: Mapped[int] = mapped_column(Integer, nullable=False)
    # Chargé seulement au téléchargement (pas dans les listes)
    content: Mapped[bytes] = deferred(mapped_column(LargeBinary, nullable=False))

    application: Mapped[OpportunityApplication] = relationship(back_populates="files")
