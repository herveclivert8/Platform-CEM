"""project goal and progress (« 5 200 / 8 000 livres collectés »)

Revision ID: 0019
Revises: 0018
Create Date: 2026-09-27

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0019"
down_revision: Union[str, None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("goal_value", sa.Integer(), nullable=True))
    op.add_column("projects", sa.Column("progress_value", sa.Integer(), nullable=True))
    op.add_column("projects", sa.Column("goal_unit", sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "goal_unit")
    op.drop_column("projects", "progress_value")
    op.drop_column("projects", "goal_value")
