"""association_settings: customizable home page cover (photo, badge, title, subtitle in FR/EN)

Revision ID: 0013
Revises: 0012
Create Date: 2026-09-26

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0013"
down_revision: Union[str, None] = "0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

COLUMNS = [
    ("hero_image_url", sa.String(512)),
    ("hero_badge_fr", sa.String(255)),
    ("hero_badge_en", sa.String(255)),
    ("hero_title_fr", sa.Text()),
    ("hero_title_en", sa.Text()),
    ("hero_subtitle_fr", sa.Text()),
    ("hero_subtitle_en", sa.Text()),
]


def upgrade() -> None:
    for name, type_ in COLUMNS:
        op.add_column("association_settings", sa.Column(name, type_, nullable=True))


def downgrade() -> None:
    for name, _ in reversed(COLUMNS):
        op.drop_column("association_settings", name)
