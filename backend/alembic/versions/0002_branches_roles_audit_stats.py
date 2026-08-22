"""add branches, user_roles, audit_logs, statistics

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002"
down_revision: Union[str, None] = "0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

branch_status = sa.Enum("ACTIVE", "INACTIVE", "PENDING", name="branch_status")
role_type = sa.Enum("MEMBER", "CONTRIBUTOR", "ADMIN", "SUPER_ADMIN", name="role_type")


def upgrade() -> None:
    # app.models.user.UserRole gained super_admin/city_admin after the initial migration
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin'")
    op.execute("ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'city_admin'")

    op.create_table(
        "branches",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("country", sa.String(100), nullable=False),
        sa.Column("continent", sa.String(50), nullable=True),
        sa.Column("latitude", sa.Numeric(10, 8), nullable=True),
        sa.Column("longitude", sa.Numeric(11, 8), nullable=True),
        sa.Column("contact_name", sa.String(255), nullable=True),
        sa.Column("contact_email", sa.String(255), nullable=True),
        sa.Column("contact_phone", sa.String(20), nullable=True),
        sa.Column("physical_address", sa.String(512), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("logo_url", sa.String(512), nullable=True),
        sa.Column("banner_url", sa.String(512), nullable=True),
        sa.Column("status", branch_status, nullable=False, server_default="ACTIVE"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_branches_name", "branches", ["name"])
    op.create_index("ix_branches_country", "branches", ["country"])
    op.create_index("ix_branches_status", "branches", ["status"])

    op.add_column(
        "publications",
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id", ondelete="CASCADE"), nullable=True),
    )
    op.execute(
        "DELETE FROM publications WHERE branch_id IS NULL"
    )
    op.alter_column("publications", "branch_id", nullable=False)

    op.create_table(
        "user_roles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id", ondelete="CASCADE"), nullable=True),
        sa.Column("role", role_type, nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_user_roles_user_id", "user_roles", ["user_id"])
    op.create_index("ix_user_roles_branch_id", "user_roles", ["branch_id"])
    op.create_index("ix_user_roles_role", "user_roles", ["role"])

    op.create_table(
        "audit_logs",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("user_email", sa.String(255), nullable=True),
        sa.Column("action", sa.String(50), nullable=True),
        sa.Column("resource_type", sa.String(50), nullable=True),
        sa.Column("resource_id", sa.Integer(), nullable=True),
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id"), nullable=True),
        sa.Column("details", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(45), nullable=True),
        sa.Column("user_agent", sa.String(500), nullable=True),
        sa.Column("success", sa.Integer(), server_default="1"),
        sa.Column("error_message", sa.String(500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )

    op.create_table(
        "statistics",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id", ondelete="CASCADE"), nullable=True),
        sa.Column("metric_type", sa.String(100), nullable=False),
        sa.Column("metric_value", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("recorded_date", sa.Date(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_statistics_branch_id", "statistics", ["branch_id"])
    op.create_index("ix_statistics_metric_type", "statistics", ["metric_type"])
    op.create_index("ix_statistics_recorded_date", "statistics", ["recorded_date"])


def downgrade() -> None:
    op.drop_table("statistics")
    op.drop_table("audit_logs")
    op.drop_table("user_roles")
    op.drop_column("publications", "branch_id")
    op.drop_table("branches")
    branch_status.drop(op.get_bind(), checkfirst=True)
    role_type.drop(op.get_bind(), checkfirst=True)
    # Postgres does not support removing values from an existing enum type;
    # 'super_admin'/'city_admin' are intentionally left on user_role.
