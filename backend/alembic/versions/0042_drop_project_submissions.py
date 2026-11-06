"""drop project_submissions: the public "porteur de projet" form and its back-office are removed

Revision ID: 0042
Revises: 0041
Create Date: 2026-11-06

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0042"
down_revision: Union[str, None] = "0041"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_table("project_submissions")


def downgrade() -> None:
    # Recrée la table vide (les dossiers supprimés ne sont pas restaurés)
    op.create_table(
        "project_submissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False),
        sa.Column("applicant_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("project_summary", sa.Text(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="RECEIVED"),
        sa.Column("internal_notes", sa.Text(), nullable=True),
        sa.Column("status_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("acknowledgment_sent_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_project_submissions_branch_id", "project_submissions", ["branch_id"])
    op.create_index("ix_project_submissions_status", "project_submissions", ["status"])
