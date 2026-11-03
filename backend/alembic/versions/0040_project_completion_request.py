"""project completion request: a member flags their ongoing project as achieved

Revision ID: 0040
Revises: 0039
Create Date: 2026-11-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0040"
down_revision: Union[str, None] = "0039"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("completion_requested_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("projects", sa.Column("completion_note", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "completion_note")
    op.drop_column("projects", "completion_requested_at")
