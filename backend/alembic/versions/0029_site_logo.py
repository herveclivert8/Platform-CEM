"""site logo chosen by the super admin; drop the public site colors (appearance page removed)

Revision ID: 0029
Revises: 0028
Create Date: 2026-10-19

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0029"
down_revision: Union[str, None] = "0028"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("association_settings", "theme_neutral_color")
    op.drop_column("association_settings", "theme_accent_color")
    op.add_column("association_settings", sa.Column("logo_url", sa.String(512), nullable=True))
    op.add_column("association_settings", sa.Column("logo_mark_url", sa.String(512), nullable=True))


def downgrade() -> None:
    op.drop_column("association_settings", "logo_mark_url")
    op.drop_column("association_settings", "logo_url")
    op.add_column("association_settings", sa.Column("theme_accent_color", sa.String(7), nullable=True))
    op.add_column("association_settings", sa.Column("theme_neutral_color", sa.String(7), nullable=True))
