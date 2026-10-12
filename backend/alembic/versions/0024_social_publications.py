"""social publications: automatic posting history to Facebook, Instagram and LinkedIn

Revision ID: 0024
Revises: 0023
Create Date: 2026-10-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0024"
down_revision: Union[str, None] = "0023"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "social_publications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("resource_type", sa.String(20), nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=False),
        sa.Column("network", sa.String(20), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("message", sa.Text(), nullable=False),
        sa.Column("external_id", sa.String(255), nullable=True),
        sa.Column("external_url", sa.String(512), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("simulated", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("resource_type", "resource_id", "network", name="uq_social_publication"),
    )
    op.create_index("ix_social_publications_resource_id", "social_publications", ["resource_id"])
    op.create_index("ix_social_publications_status", "social_publications", ["status"])


def downgrade() -> None:
    op.drop_table("social_publications")
