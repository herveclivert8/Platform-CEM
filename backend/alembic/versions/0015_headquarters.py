"""add branches.is_headquarters and the « CEM International » headquarters entity

Revision ID: 0015
Revises: 0014
Create Date: 2026-09-27

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0015"
down_revision: Union[str, None] = "0014"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "branches",
        sa.Column("is_headquarters", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_index("ix_branches_is_headquarters", "branches", ["is_headquarters"])

    # Le siège porte les actions et événements du CEM qui ne relèvent d'aucune antenne.
    op.execute(
        """
        INSERT INTO branches (name, country, continent, physical_address, description, status, is_headquarters)
        SELECT 'CEM International', 'France', 'Europe', '31 Avenue de Ségur, 75007 Paris',
               'Siège de l''association : actions et événements portés directement par le CEM, en France et à l''international.',
               'ACTIVE', true
        WHERE NOT EXISTS (SELECT 1 FROM branches WHERE is_headquarters)
        """
    )


def downgrade() -> None:
    op.execute("DELETE FROM branches WHERE is_headquarters")
    op.drop_index("ix_branches_is_headquarters", table_name="branches")
    op.drop_column("branches", "is_headquarters")
