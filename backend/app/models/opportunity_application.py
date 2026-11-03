"""
Modèle OpportunityApplication
Candidature d'un membre à une opportunité du Club (aujourd'hui : poursuite d'études en Italie).
Réservée aux membres validés rattachés à une antenne ; consultée par le Super Admin seulement.
Le dossier de financement est stocké en base, comme les documents de projet : jamais accessible par
un lien direct, il est servi par l'API au Super Admin.
"""

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, LargeBinary, String, Text, func
from sqlalchemy.orm import Mapped, deferred, mapped_column

from app.db.base import Base

PROGRAM_ITALY = "ITALY_STUDIES"

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

    # Dossier de financement (PDF, Word, Excel ou PowerPoint)
    dossier_file_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dossier_content_type: Mapped[str] = mapped_column(String(150), nullable=False)
    dossier_size: Mapped[int] = mapped_column(Integer, nullable=False)
    # Chargé seulement au téléchargement (pas dans les listes)
    dossier_content: Mapped[bytes] = deferred(mapped_column(LargeBinary, nullable=False))

    status: Mapped[str] = mapped_column(String(20), nullable=False, default=STATUS_NEW, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
