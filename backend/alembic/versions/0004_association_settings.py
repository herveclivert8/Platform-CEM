"""add association_settings singleton table

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-22

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "association_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("facebook_url", sa.String(512), nullable=True),
        sa.Column("x_url", sa.String(512), nullable=True),
        sa.Column("linkedin_url", sa.String(512), nullable=True),
        sa.Column("youtube_url", sa.String(512), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.execute("INSERT INTO association_settings (id) VALUES (1)")


def downgrade() -> None:
    op.drop_table("association_settings")
