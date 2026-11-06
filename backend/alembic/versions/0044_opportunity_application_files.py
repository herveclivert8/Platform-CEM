"""opportunity applications: several attached files instead of a single financing file

Les dossiers déjà reçus deviennent le premier fichier joint de leur candidature.

Revision ID: 0044
Revises: 0043
Create Date: 2026-11-06

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0044"
down_revision: Union[str, None] = "0043"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

OLD_COLUMNS = ("dossier_file_name", "dossier_content_type", "dossier_size", "dossier_content")


def upgrade() -> None:
    op.create_table(
        "opportunity_application_files",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "application_id",
            sa.Integer(),
            sa.ForeignKey("opportunity_applications.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("file_name", sa.String(255), nullable=False),
        sa.Column("content_type", sa.String(150), nullable=False),
        sa.Column("size", sa.Integer(), nullable=False),
        sa.Column("content", sa.LargeBinary(), nullable=False),
    )
    op.create_index(
        "ix_opportunity_application_files_application_id", "opportunity_application_files", ["application_id"]
    )
    op.execute(
        """
        INSERT INTO opportunity_application_files (application_id, position, file_name, content_type, size, content)
        SELECT id, 0, dossier_file_name, dossier_content_type, dossier_size, dossier_content
        FROM opportunity_applications
        """
    )
    for column in OLD_COLUMNS:
        op.drop_column("opportunity_applications", column)


def downgrade() -> None:
    # Seul le premier fichier de chaque candidature est conservé
    op.add_column("opportunity_applications", sa.Column("dossier_file_name", sa.String(255), nullable=True))
    op.add_column("opportunity_applications", sa.Column("dossier_content_type", sa.String(150), nullable=True))
    op.add_column("opportunity_applications", sa.Column("dossier_size", sa.Integer(), nullable=True))
    op.add_column("opportunity_applications", sa.Column("dossier_content", sa.LargeBinary(), nullable=True))
    op.execute(
        """
        UPDATE opportunity_applications a
        SET dossier_file_name = f.file_name, dossier_content_type = f.content_type,
            dossier_size = f.size, dossier_content = f.content
        FROM (
            SELECT DISTINCT ON (application_id) * FROM opportunity_application_files
            ORDER BY application_id, position, id
        ) f
        WHERE f.application_id = a.id
        """
    )
    op.execute("DELETE FROM opportunity_applications WHERE dossier_content IS NULL")
    for column in OLD_COLUMNS:
        op.alter_column("opportunity_applications", column, nullable=False)
    op.drop_index("ix_opportunity_application_files_application_id", table_name="opportunity_application_files")
    op.drop_table("opportunity_application_files")
