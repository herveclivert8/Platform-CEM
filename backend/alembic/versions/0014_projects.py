"""add projects (projets en cours / réalisations) with super-admin review

Revision ID: 0014
Revises: 0013
Create Date: 2026-09-25

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0014"
down_revision: Union[str, None] = "0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Le type "pillar" existe déjà (créé avec la table posts en 0003).
pillar = postgresql.ENUM("EDUCATION", "SOCIAL", "SPORT", "ENTERPRISE", name="pillar", create_type=False)
project_phase = postgresql.ENUM("ONGOING", "COMPLETED", name="project_phase")
project_review_status = postgresql.ENUM("PENDING", "APPROVED", "REJECTED", name="project_review_status")


def upgrade() -> None:
    project_phase.create(op.get_bind(), checkfirst=True)
    project_review_status.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "projects",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("summary", sa.String(500), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("pillar", pillar, nullable=False),
        sa.Column("beneficiaries", sa.String(255), nullable=False),
        sa.Column("beneficiaries_count", sa.Integer(), nullable=True),
        sa.Column("location", sa.String(255), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("end_date", sa.Date(), nullable=True),
        sa.Column("phase", postgresql.ENUM(name="project_phase", create_type=False), nullable=False),
        sa.Column(
            "review_status",
            postgresql.ENUM(name="project_review_status", create_type=False),
            nullable=False,
            server_default="PENDING",
        ),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("reviewed_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_projects_branch_id", "projects", ["branch_id"])
    op.create_index("ix_projects_phase", "projects", ["phase"])
    op.create_index("ix_projects_review_status", "projects", ["review_status"])

    op.create_table(
        "project_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.String(512), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_project_images_project_id", "project_images", ["project_id"])


def downgrade() -> None:
    op.drop_index("ix_project_images_project_id", table_name="project_images")
    op.drop_table("project_images")
    op.drop_index("ix_projects_review_status", table_name="projects")
    op.drop_index("ix_projects_phase", table_name="projects")
    op.drop_index("ix_projects_branch_id", table_name="projects")
    op.drop_table("projects")
    project_review_status.drop(op.get_bind(), checkfirst=True)
    project_phase.drop(op.get_bind(), checkfirst=True)
