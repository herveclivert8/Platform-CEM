"""editable subtitle under « Nos antennes » (home page map)

Revision ID: 0017
Revises: 0016
Create Date: 2026-09-27

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0017"
down_revision: Union[str, None] = "0016"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("association_settings", sa.Column("map_subtitle", sa.String(300), nullable=True))


def downgrade() -> None:
    op.drop_column("association_settings", "map_subtitle")
