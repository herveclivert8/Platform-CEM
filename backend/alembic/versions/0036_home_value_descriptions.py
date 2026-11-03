"""home value descriptions: comment of each footer value, shown on hover

Revision ID: 0036
Revises: 0035
Create Date: 2026-11-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0036"
down_revision: Union[str, None] = "0035"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("association_settings", sa.Column("home_value_descriptions", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("association_settings", "home_value_descriptions")
