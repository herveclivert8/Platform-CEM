"""member numbers: 4 first letters of the branch + rank (PARI0045), given at validation; numbers
for the members already validated, in order of sign-up

Revision ID: 0034
Revises: 0033
Create Date: 2026-10-30

"""
import unicodedata
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0034"
down_revision: Union[str, None] = "0033"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _prefix(branch_name: str) -> str:
    # Copie figée de app.services.member_numbers.branch_prefix (une migration n'importe pas l'application)
    ascii_name = unicodedata.normalize("NFKD", branch_name).encode("ascii", "ignore").decode()
    return "".join(c for c in ascii_name if c.isalpha()).upper()[:4] or "CEM"


def upgrade() -> None:
    op.add_column("users", sa.Column("member_number", sa.String(16), nullable=True))
    op.create_unique_constraint("uq_users_member_number", "users", ["member_number"])

    # Membres déjà validés (actifs ou désactivés depuis) : numérotés dans l'ordre d'inscription.
    # Comparaisons en texte : sur une base neuve, les valeurs d'enum ajoutées par les migrations
    # précédentes ne sont pas encore validées (même transaction) et Postgres refuse de les utiliser.
    conn = op.get_bind()
    rows = conn.execute(
        sa.text(
            """
            SELECT u.id, b.name FROM users u JOIN branches b ON b.id = u.branch_id
            WHERE u.role::text = 'MEMBER' AND u.membership_type = 'ACTIVE' AND u.anonymized_at IS NULL
              AND u.membership_status::text IN ('ACTIVE', 'SUSPENDED')
            ORDER BY u.created_at, u.id
            """
        )
    ).all()
    ranks: dict[str, int] = {}
    for user_id, branch_name in rows:
        prefix = _prefix(branch_name)
        ranks[prefix] = ranks.get(prefix, 0) + 1
        conn.execute(
            sa.text("UPDATE users SET member_number = :number WHERE id = :id"),
            {"number": f"{prefix}{ranks[prefix]:04d}", "id": user_id},
        )


def downgrade() -> None:
    op.drop_constraint("uq_users_member_number", "users", type_="unique")
    op.drop_column("users", "member_number")
