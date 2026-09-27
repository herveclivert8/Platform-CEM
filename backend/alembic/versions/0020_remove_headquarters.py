"""remove the « CEM International » headquarters entity: everything belongs to a branch

Contents of the headquarters are moved to real branches (Rome and Istanbul are created only when
there is demo content to move to them; anything else goes to Paris), then the headquarters row and
the is_headquarters flag are dropped. On an empty database nothing is created.

Revision ID: 0020
Revises: 0019
Create Date: 2026-09-27

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0020"
down_revision: Union[str, None] = "0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

CONTENT_TABLES = ("posts", "projects", "publications", "donations", "project_submissions", "team_members")


def upgrade() -> None:
    bind = op.get_bind()
    hq_id = bind.execute(sa.text("SELECT id FROM branches WHERE is_headquarters")).scalar()
    if hq_id is not None:
        def branch_id(name: str, country: str, lat: float, lng: float) -> int:
            existing = bind.execute(
                sa.text("SELECT id FROM branches WHERE name = :n AND NOT is_headquarters"), {"n": name}
            ).scalar()
            if existing is not None:
                return existing
            return bind.execute(
                sa.text(
                    "INSERT INTO branches (name, country, continent, latitude, longitude, status, is_headquarters) "
                    "VALUES (:n, :c, 'Europe', :lat, :lng, 'ACTIVE', false) RETURNING id"
                ),
                {"n": name, "c": country, "lat": lat, "lng": lng},
            ).scalar()

        def has_content(table: str, title_like: str | None = None) -> bool:
            query = f"SELECT 1 FROM {table} WHERE branch_id = :hq" + (" AND title LIKE :t" if title_like else "")
            return bind.execute(sa.text(query + " LIMIT 1"), {"hq": hq_id, "t": title_like}).first() is not None

        # Antennes créées seulement s'il y a un contenu à leur rattacher : sur une base neuve (CI,
        # nouvelle installation) le siège est vide et le seed crée lui-même Rome et Istanbul.
        if has_content("posts", "%Rome%"):
            rome = branch_id("Rome", "Italie", 41.8933, 12.4829)
            bind.execute(sa.text("UPDATE posts SET branch_id = :b WHERE branch_id = :hq AND title LIKE '%Rome%'"), {"b": rome, "hq": hq_id})
        if has_content("projects", "%Istanbul%"):
            istanbul = branch_id("Istanbul", "Turquie", 41.0064, 28.9759)
            bind.execute(sa.text("UPDATE projects SET branch_id = :b WHERE branch_id = :hq AND title LIKE '%Istanbul%'"), {"b": istanbul, "hq": hq_id})
        leftovers = [t for t in CONTENT_TABLES if has_content(t)]
        if leftovers:
            fallback = bind.execute(sa.text("SELECT id FROM branches WHERE name = 'Paris' AND NOT is_headquarters")).scalar()
            if fallback is None:
                fallback = branch_id("Paris", "France", 48.8566, 2.3522)
            for table in leftovers:
                bind.execute(sa.text(f"UPDATE {table} SET branch_id = :b WHERE branch_id = :hq"), {"b": fallback, "hq": hq_id})
        bind.execute(sa.text("UPDATE users SET branch_id = NULL WHERE branch_id = :hq"), {"hq": hq_id})
        bind.execute(sa.text("DELETE FROM branches WHERE id = :hq"), {"hq": hq_id})

    op.drop_index("ix_branches_is_headquarters", table_name="branches")
    op.drop_column("branches", "is_headquarters")


def downgrade() -> None:
    op.add_column("branches", sa.Column("is_headquarters", sa.Boolean(), nullable=False, server_default=sa.false()))
    op.create_index("ix_branches_is_headquarters", "branches", ["is_headquarters"])
