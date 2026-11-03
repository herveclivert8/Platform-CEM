"""cash and in-kind donations: recorded by an admin (cash handed over, or material)

Revision ID: 0041
Revises: 0040
Create Date: 2026-11-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0041"
down_revision: Union[str, None] = "0040"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Une nouvelle valeur d'enum doit être validée avant d'être utilisée : hors transaction
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'CASH'")
        op.execute("ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'IN_KIND'")
    op.add_column("donations", sa.Column("in_kind_description", sa.Text(), nullable=True))


def downgrade() -> None:
    # PostgreSQL ne sait pas retirer une valeur d'enum : les dons en espèces et matériels sont supprimés,
    # les valeurs CASH et IN_KIND restent dans le type (inutilisées)
    op.execute("DELETE FROM donations WHERE payment_method IN ('CASH', 'IN_KIND')")
    op.drop_column("donations", "in_kind_description")
