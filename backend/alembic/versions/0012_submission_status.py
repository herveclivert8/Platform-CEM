"""project_submissions: statut de traitement, notes internes, accusé de réception

Revision ID: 0012
Revises: 0011
Create Date: 2026-09-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0012"
down_revision: Union[str, None] = "0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "project_submissions",
        sa.Column("status", sa.String(20), nullable=False, server_default="RECEIVED"),
    )
    op.add_column("project_submissions", sa.Column("internal_notes", sa.Text(), nullable=True))
    op.add_column("project_submissions", sa.Column("status_updated_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "project_submissions", sa.Column("acknowledgment_sent_at", sa.DateTime(timezone=True), nullable=True)
    )
    op.create_index("ix_project_submissions_status", "project_submissions", ["status"])


def downgrade() -> None:
    op.drop_index("ix_project_submissions_status", table_name="project_submissions")
    for column in ("acknowledgment_sent_at", "status_updated_at", "internal_notes", "status"):
        op.drop_column("project_submissions", column)
