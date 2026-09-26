"""
Modèle ProjectSubmission
Dossier soumis par un porteur de projet/entrepreneur à une antenne locale.
"""

import enum
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class SubmissionStatus(str, enum.Enum):
    RECEIVED = "RECEIVED"  # Reçu, pas encore traité
    IN_REVIEW = "IN_REVIEW"  # En cours d'étude
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class ProjectSubmission(Base):
    __tablename__ = "project_submissions"

    id: Mapped[int] = mapped_column(primary_key=True)
    branch_id: Mapped[int] = mapped_column(ForeignKey("branches.id", ondelete="CASCADE"), nullable=False, index=True)
    applicant_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False)
    project_summary: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default=SubmissionStatus.RECEIVED.value, server_default="RECEIVED", index=True
    )
    # Visibles uniquement par les admins
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    status_updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Accusé de réception envoyé au porteur de projet (dossier déposé sur le site)
    acknowledgment_sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    branch: Mapped["Branch"] = relationship()
