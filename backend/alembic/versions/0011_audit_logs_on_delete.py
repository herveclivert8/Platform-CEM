"""audit_logs: ON DELETE SET NULL vers users et branches

Sans cela, supprimer un admin ou une antenne ayant des entrées d'audit échoue (clé étrangère).
L'email de l'auteur reste dans user_email.

Revision ID: 0011
Revises: 0010
Create Date: 2026-09-26

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0011"
down_revision: Union[str, None] = "0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _recreate_fks(ondelete: str | None) -> None:
    op.drop_constraint("audit_logs_user_id_fkey", "audit_logs", type_="foreignkey")
    op.drop_constraint("audit_logs_branch_id_fkey", "audit_logs", type_="foreignkey")
    op.create_foreign_key(
        "audit_logs_user_id_fkey", "audit_logs", "users", ["user_id"], ["id"], ondelete=ondelete
    )
    op.create_foreign_key(
        "audit_logs_branch_id_fkey", "audit_logs", "branches", ["branch_id"], ["id"], ondelete=ondelete
    )


def upgrade() -> None:
    _recreate_fks("SET NULL")
    op.create_index("ix_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_audit_logs_created_at", table_name="audit_logs")
    _recreate_fks(None)
