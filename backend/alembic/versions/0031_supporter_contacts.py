"""supporter contacts: details left by future benefactors and sponsors (no account, Super Admin only)

Revision ID: 0031
Revises: 0030
Create Date: 2026-10-30

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0031"
down_revision: Union[str, None] = "0030"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "supporter_contacts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("kind", sa.String(20), nullable=False),
        sa.Column("full_name", sa.String(200), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("phone", sa.String(50), nullable=True),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column("lang", sa.String(8), nullable=False, server_default="fr"),
        sa.Column("status", sa.String(20), nullable=False, server_default="NEW"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("contacted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_supporter_contacts_kind", "supporter_contacts", ["kind"])
    op.create_index("ix_supporter_contacts_status", "supporter_contacts", ["status"])


def downgrade() -> None:
    op.drop_index("ix_supporter_contacts_status", table_name="supporter_contacts")
    op.drop_index("ix_supporter_contacts_kind", table_name="supporter_contacts")
    op.drop_table("supporter_contacts")
