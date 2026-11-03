"""opportunity applications: members' applications to the Club's opportunities (studies in Italy)

Revision ID: 0035
Revises: 0034
Create Date: 2026-10-30

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0035"
down_revision: Union[str, None] = "0034"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "opportunity_applications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("program", sa.String(30), nullable=False, server_default="ITALY_STUDIES"),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("last_name", sa.String(255), nullable=False),
        sa.Column("first_name", sa.String(255), nullable=False),
        sa.Column("member_number", sa.String(16), nullable=False),
        sa.Column("branch_name", sa.String(255), nullable=True),
        sa.Column("phone", sa.String(50), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("study_level", sa.String(100), nullable=False),
        sa.Column("faculty", sa.String(255), nullable=False),
        sa.Column("major", sa.String(255), nullable=False),
        sa.Column("motivation", sa.Text(), nullable=False),
        sa.Column("dossier_file_name", sa.String(255), nullable=False),
        sa.Column("dossier_content_type", sa.String(150), nullable=False),
        sa.Column("dossier_size", sa.Integer(), nullable=False),
        sa.Column("dossier_content", sa.LargeBinary(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="NEW"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_opportunity_applications_program", "opportunity_applications", ["program"])
    op.create_index("ix_opportunity_applications_user_id", "opportunity_applications", ["user_id"])
    op.create_index("ix_opportunity_applications_status", "opportunity_applications", ["status"])


def downgrade() -> None:
    op.drop_table("opportunity_applications")
