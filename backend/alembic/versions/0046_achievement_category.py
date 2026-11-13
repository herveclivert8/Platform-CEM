"""projects: achievement category (Éducation, Événementiels, Projets entrepreneuriaux)

Rubrique sous laquelle une réalisation est affichée dans « Nos réalisations » sur la page
d'accueil. Les projets existants sont rangés d'après leur domaine d'action quand il correspond
(Éducation et formation, Création d'entreprise) ; les autres sont à classer dans l'admin.

Revision ID: 0046
Revises: 0045
Create Date: 2026-11-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0046"
down_revision: Union[str, None] = "0045"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("achievement_category", sa.String(20), nullable=True))
    op.create_index("ix_projects_achievement_category", "projects", ["achievement_category"])
    op.execute("UPDATE projects SET achievement_category = 'EDUCATION' WHERE pillar::text = 'EDUCATION'")
    op.execute("UPDATE projects SET achievement_category = 'ENTERPRISE' WHERE pillar::text = 'ENTERPRISE'")


def downgrade() -> None:
    op.drop_index("ix_projects_achievement_category", table_name="projects")
    op.drop_column("projects", "achievement_category")
