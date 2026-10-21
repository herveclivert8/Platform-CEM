"""site appearance: public site colors chosen by the super admin

Revision ID: 0027
Revises: 0026
Create Date: 2026-10-14

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0027"
down_revision: Union[str, None] = "0026"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("association_settings", sa.Column("theme_accent_color", sa.String(7), nullable=True))
    op.add_column("association_settings", sa.Column("theme_neutral_color", sa.String(7), nullable=True))


def downgrade() -> None:
    op.drop_column("association_settings", "theme_neutral_color")
    op.drop_column("association_settings", "theme_accent_color")
