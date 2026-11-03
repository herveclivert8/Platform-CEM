"""institutional partners: « Ils nous font confiance » on the home page, edited by the super admin

Revision ID: 0038
Revises: 0037
Create Date: 2026-11-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0038"
down_revision: Union[str, None] = "0037"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("association_settings", sa.Column("institutional_partners", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("association_settings", "institutional_partners")
