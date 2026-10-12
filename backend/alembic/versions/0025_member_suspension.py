"""member suspension: SUSPENDED membership status (monthly fee unpaid on the 30th)

Revision ID: 0025
Revises: 0024
Create Date: 2026-10-12

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0025"
down_revision: Union[str, None] = "0024"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE membership_status ADD VALUE IF NOT EXISTS 'SUSPENDED'")


def downgrade() -> None:
    # PostgreSQL ne sait pas retirer une valeur d'un ENUM : les membres désactivés redeviennent actifs
    # (sans accès, faute de cotisation à jour) puis le type est recréé sans SUSPENDED
    op.execute("ALTER TABLE users ALTER COLUMN membership_status TYPE VARCHAR(20)")
    op.execute("UPDATE users SET membership_status = 'ACTIVE' WHERE membership_status = 'SUSPENDED'")
    op.execute("DROP TYPE membership_status")
    op.execute("CREATE TYPE membership_status AS ENUM ('PENDING', 'ACTIVE', 'REJECTED')")
    op.execute(
        "ALTER TABLE users ALTER COLUMN membership_status TYPE membership_status "
        "USING membership_status::membership_status"
    )
