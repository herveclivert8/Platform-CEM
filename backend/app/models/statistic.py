"""
Modèle Statistic
Suivi des métriques par antenne et globales
"""

from datetime import date, datetime

from sqlalchemy import DateTime, Date, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Statistic(Base):
    __tablename__ = "statistics"

    id: Mapped[int] = mapped_column(primary_key=True)
    
    # Antenne (NULL = statistiques globales)
    branch_id: Mapped[int | None] = mapped_column(
        ForeignKey("branches.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    
    # Type de métrique
    metric_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
        index=True,
    )
    # Exemples: "publications_count", "visitors", "page_views", etc.
    
    # Valeur
    metric_value: Mapped[int] = mapped_column(
        Integer,
        default=0,
        nullable=False,
    )
    
    # Date d'enregistrement
    recorded_date: Mapped[date] = mapped_column(
        Date,
        nullable=False,
        index=True,
    )
    
    # Timestamp de création
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    
    # Relation
    branch: Mapped["Branch | None"] = relationship(
        "Branch",
        back_populates="statistics",
        lazy="select",
    )
    
    __table_args__ = (
        # Index unique: une seule métrique par branche/type/date
    )
    
    def __repr__(self) -> str:
        return f"<Statistic(branch_id={self.branch_id}, metric_type={self.metric_type}, value={self.metric_value}, date={self.recorded_date})>"
