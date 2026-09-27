"""home page values/contact settings and automatic FR -> EN content translations

Revision ID: 0016
Revises: 0015
Create Date: 2026-09-27

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0016"
down_revision: Union[str, None] = "0015"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("association_settings", sa.Column("home_values", sa.JSON(), nullable=True))
    op.add_column("association_settings", sa.Column("contact_address", sa.String(512), nullable=True))
    op.add_column("association_settings", sa.Column("contact_email", sa.String(255), nullable=True))
    op.add_column("association_settings", sa.Column("contact_phone", sa.String(50), nullable=True))

    op.create_table(
        "content_translations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("resource_type", sa.String(50), nullable=False),
        sa.Column("resource_id", sa.Integer(), nullable=False),
        sa.Column("field", sa.String(100), nullable=False),
        sa.Column("lang", sa.String(8), nullable=False),
        sa.Column("source_hash", sa.String(64), nullable=False),
        sa.Column("text", sa.Text(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("resource_type", "resource_id", "field", "lang", name="uq_content_translation"),
    )


def downgrade() -> None:
    op.drop_table("content_translations")
    op.drop_column("association_settings", "contact_phone")
    op.drop_column("association_settings", "contact_email")
    op.drop_column("association_settings", "contact_address")
    op.drop_column("association_settings", "home_values")
