"""uploaded_files: propriétaire de chaque fichier envoyé

Revision ID: 0010
Revises: 0009
Create Date: 2026-09-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0010"
down_revision: Union[str, None] = "0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "uploaded_files",
        sa.Column("filename", sa.String(255), primary_key=True),
        sa.Column("uploaded_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_uploaded_files_branch_id", "uploaded_files", ["branch_id"])


def downgrade() -> None:
    op.drop_index("ix_uploaded_files_branch_id", table_name="uploaded_files")
    op.drop_table("uploaded_files")
