"""badge QR code: random token per user, resolved live by the public verification page

Revision ID: 0028
Revises: 0027
Create Date: 2026-10-16

"""
import secrets
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0028"
down_revision: Union[str, None] = "0027"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("badge_token", sa.String(32), nullable=True))
    conn = op.get_bind()
    for (user_id,) in conn.execute(sa.text("SELECT id FROM users")).fetchall():
        conn.execute(
            sa.text("UPDATE users SET badge_token = :token WHERE id = :id"),
            {"token": secrets.token_urlsafe(16), "id": user_id},
        )
    op.alter_column("users", "badge_token", nullable=False)
    op.create_index("ix_users_badge_token", "users", ["badge_token"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_users_badge_token", table_name="users")
    op.drop_column("users", "badge_token")
