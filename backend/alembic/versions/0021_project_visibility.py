"""project visibility chosen by admins (hidden projects stay in the back-office only)

Revision ID: 0021
Revises: 0020
Create Date: 2026-09-27

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0021"
down_revision: Union[str, None] = "0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("is_visible", sa.Boolean(), nullable=False, server_default=sa.true()))
    op.create_index("ix_projects_is_visible", "projects", ["is_visible"])


def downgrade() -> None:
    op.drop_index("ix_projects_is_visible", table_name="projects")
    op.drop_column("projects", "is_visible")
