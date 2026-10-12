"""members: MEMBER role, membership status and phone on users

Revision ID: 0022
Revises: 0021
Create Date: 2026-10-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0022"
down_revision: Union[str, None] = "0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

membership_status = sa.Enum("PENDING", "ACTIVE", "REJECTED", name="membership_status")


def upgrade() -> None:
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'MEMBER'")
    membership_status.create(op.get_bind(), checkfirst=True)
    op.add_column("users", sa.Column("phone", sa.String(30), nullable=True))
    op.add_column("users", sa.Column("membership_status", membership_status, nullable=True))
    op.create_index("ix_users_membership_status", "users", ["membership_status"])


def downgrade() -> None:
    op.execute("DELETE FROM users WHERE role = 'MEMBER'")
    op.drop_index("ix_users_membership_status", table_name="users")
    op.drop_column("users", "membership_status")
    op.drop_column("users", "phone")
    membership_status.drop(op.get_bind(), checkfirst=True)
    # PostgreSQL ne sait pas retirer une valeur d'un ENUM : on recrée le type
    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
    op.execute("ALTER TYPE user_role RENAME TO user_role_old")
    op.execute("CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'BRANCH_ADMIN')")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::text::user_role")
    op.execute("DROP TYPE user_role_old")
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'BRANCH_ADMIN'")
