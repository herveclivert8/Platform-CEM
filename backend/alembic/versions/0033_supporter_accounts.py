"""supporter accounts: membership type of members, and the account created when a benefactor or
sponsor request is accepted

Revision ID: 0033
Revises: 0032
Create Date: 2026-10-30

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0033"
down_revision: Union[str, None] = "0032"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("membership_type", sa.String(20), nullable=False, server_default="ACTIVE"))
    op.create_index("ix_users_membership_type", "users", ["membership_type"])
    op.add_column("supporter_contacts", sa.Column("accepted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "supporter_contacts",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("supporter_contacts", "user_id")
    op.drop_column("supporter_contacts", "accepted_at")
    op.drop_index("ix_users_membership_type", table_name="users")
    op.drop_column("users", "membership_type")
