"""five fields of action: posts and projects use the fields of « Qui sommes-nous »

EDUCATION and ENTERPRISE are kept, SOCIAL becomes SOLIDARITY, SPORT (« Éducation par le Sport »)
becomes EDUCATION; RESEARCH and SUSTAINABILITY are new.

Revision ID: 0037
Revises: 0036
Create Date: 2026-11-03

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0037"
down_revision: Union[str, None] = "0036"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABLES = ("posts", "projects")


def _replace_type(values: tuple[str, ...], mapping: dict[str, str]) -> None:
    """Recréer le type « pillar » avec `values`, en convertissant les lignes selon `mapping`."""
    op.execute("ALTER TYPE pillar RENAME TO pillar_old")
    op.execute(f"CREATE TYPE pillar AS ENUM ({', '.join(repr(v) for v in values)})")
    cases = " ".join(f"WHEN '{old}' THEN '{new}'" for old, new in mapping.items())
    for table in TABLES:
        op.execute(
            f"ALTER TABLE {table} ALTER COLUMN pillar TYPE pillar "
            f"USING (CASE pillar::text {cases} ELSE pillar::text END)::pillar"
        )
    op.execute("DROP TYPE pillar_old")


def upgrade() -> None:
    _replace_type(
        ("EDUCATION", "ENTERPRISE", "RESEARCH", "SOLIDARITY", "SUSTAINABILITY"),
        {"SOCIAL": "SOLIDARITY", "SPORT": "EDUCATION"},
    )


def downgrade() -> None:
    _replace_type(
        ("EDUCATION", "SOCIAL", "SPORT", "ENTERPRISE"),
        {"SOLIDARITY": "SOCIAL", "RESEARCH": "EDUCATION", "SUSTAINABILITY": "SOCIAL"},
    )
