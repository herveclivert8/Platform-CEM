"""about page content: texts of « Qui sommes-nous » edited by the Super Admin (French, by i18n key)

Revision ID: 0032
Revises: 0031
Create Date: 2026-10-30

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0032"
down_revision: Union[str, None] = "0031"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("association_settings", sa.Column("about_content", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("association_settings", "about_content")
