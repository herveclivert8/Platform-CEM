"""
Model d'audit logging - Tracer toutes les opérations critiques
"""

from sqlalchemy import Column, Integer, String, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from app.db.base import Base


class AuditLog(Base):
    """Log d'audit pour tracer les opérations critiques"""

    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True)
    
    # Qui
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    user_email = Column(String(255))

    # Quoi
    action = Column(String(50))  # "create", "update", "delete", "login", "logout"
    resource_type = Column(String(50))  # "publication", "branch", "user"
    resource_id = Column(Integer, nullable=True)

    # Branch isolation
    branch_id = Column(Integer, ForeignKey("branches.id", ondelete="SET NULL"), nullable=True)
    
    # Détails
    details = Column(JSON, nullable=True)  # Données additionnelles
    ip_address = Column(String(45), nullable=True)  # IPv4 ou IPv6
    user_agent = Column(String(500), nullable=True)
    
    # Status
    success = Column(Integer, default=1)  # 1=success, 0=failure
    error_message = Column(String(500), nullable=True)
    
    # Timestamps
    # Heure UTC sans fuseau (colonne historique "timestamp without time zone")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc).replace(tzinfo=None), index=True)
    
    # Relations
    user = relationship("User", foreign_keys=[user_id])
    branch = relationship("Branch", foreign_keys=[branch_id])

    def __repr__(self):
        return f"<AuditLog {self.id}: {self.action} {self.resource_type}/{self.resource_id}>"
