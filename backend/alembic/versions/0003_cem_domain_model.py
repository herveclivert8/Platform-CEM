"""align schema with CEM spec: 2-role RBAC, Post/Donation/ProjectSubmission/PasswordResetToken,
drop legacy Project/Tag/IdeaPost/CallForParticipation/UserBranchRole

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-21

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003"
down_revision: Union[str, None] = "0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

pillar_enum = sa.Enum("EDUCATION", "SOCIAL", "SPORT", "ENTERPRISE", name="pillar")
post_status_enum = sa.Enum("DRAFT", "PUBLISHED", name="post_status")


def upgrade() -> None:
    # ------------------------------------------------------------------
    # 1. Drop legacy content model (Project/Tag/IdeaPost/CallForParticipation)
    #    and the branch-role join table (replaced by users.branch_id).
    # ------------------------------------------------------------------
    op.drop_table("idea_posts")
    op.drop_table("calls_for_participation")
    op.drop_table("project_contributors")
    op.drop_table("project_tags")
    op.drop_table("projects")
    op.drop_table("tags")
    op.drop_table("user_roles")
    op.execute("DROP TYPE IF EXISTS role_type")

    # ------------------------------------------------------------------
    # 2. users: first_name/last_name replace full_name, branch_id (1:1 with Branch),
    #    role collapses to SUPER_ADMIN / BRANCH_ADMIN.
    # ------------------------------------------------------------------
    op.add_column("users", sa.Column("first_name", sa.String(255), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(255), nullable=True))
    op.execute(
        """
        UPDATE users SET
            first_name = COALESCE(NULLIF(split_part(full_name, ' ', 1), ''), 'Prénom'),
            last_name = COALESCE(NULLIF(regexp_replace(full_name, '^\\S+\\s*', ''), ''), 'Nom')
        """
    )
    op.alter_column("users", "first_name", nullable=False)
    op.alter_column("users", "last_name", nullable=False)
    op.drop_column("users", "full_name")

    op.add_column(
        "users",
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True),
    )
    op.create_index("ix_users_branch_id", "users", ["branch_id"])

    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text")
    op.execute("DROP TYPE user_role")
    op.execute("CREATE TYPE user_role AS ENUM ('SUPER_ADMIN', 'BRANCH_ADMIN')")
    op.execute(
        """
        UPDATE users SET role = CASE role
            WHEN 'super_admin' THEN 'SUPER_ADMIN'
            ELSE 'BRANCH_ADMIN'
        END
        """
    )
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role")
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'BRANCH_ADMIN'")

    # ------------------------------------------------------------------
    # 3. branches: manager_id (Admin d'Antenne responsable)
    # ------------------------------------------------------------------
    op.add_column(
        "branches",
        sa.Column("manager_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
    )

    # ------------------------------------------------------------------
    # 4. New CEM domain tables
    # ------------------------------------------------------------------
    op.create_table(
        "posts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("pillar", pillar_enum, nullable=False),
        sa.Column("status", post_status_enum, nullable=False, server_default="DRAFT"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_posts_branch_id", "posts", ["branch_id"])
    op.create_index("ix_posts_status", "posts", ["status"])

    op.create_table(
        "post_images",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("post_id", sa.Integer(), sa.ForeignKey("posts.id", ondelete="CASCADE"), nullable=False),
        sa.Column("url", sa.String(512), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_post_images_post_id", "post_images", ["post_id"])

    op.create_table(
        "donations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True),
        sa.Column("amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("donor_email", sa.String(255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_donations_branch_id", "donations", ["branch_id"])

    op.create_table(
        "project_submissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id", ondelete="CASCADE"), nullable=False),
        sa.Column("applicant_name", sa.String(255), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("project_summary", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_project_submissions_branch_id", "project_submissions", ["branch_id"])

    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])
    op.create_index("ix_password_reset_tokens_token_hash", "password_reset_tokens", ["token_hash"], unique=True)


def downgrade() -> None:
    op.drop_table("password_reset_tokens")
    op.drop_table("project_submissions")
    op.drop_table("donations")
    op.drop_table("post_images")
    op.drop_table("posts")
    pillar_enum.drop(op.get_bind(), checkfirst=True)
    post_status_enum.drop(op.get_bind(), checkfirst=True)

    op.drop_column("branches", "manager_id")

    op.execute("ALTER TABLE users ALTER COLUMN role DROP DEFAULT")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(50) USING role::text")
    op.execute("DROP TYPE user_role")
    op.execute("CREATE TYPE user_role AS ENUM ('member', 'contributor', 'admin', 'super_admin', 'city_admin')")
    op.execute(
        """
        UPDATE users SET role = CASE role
            WHEN 'SUPER_ADMIN' THEN 'super_admin'
            ELSE 'admin'
        END
        """
    )
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE user_role USING role::user_role")
    op.execute("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'member'")

    op.drop_index("ix_users_branch_id", table_name="users")
    op.drop_column("users", "branch_id")

    op.add_column("users", sa.Column("full_name", sa.String(255), nullable=True))
    op.execute("UPDATE users SET full_name = trim(first_name || ' ' || last_name)")
    op.alter_column("users", "full_name", nullable=False)
    op.drop_column("users", "first_name")
    op.drop_column("users", "last_name")

    # Les tables legacy (projects/tags/idea_posts/calls_for_participation/user_roles)
    # ne sont pas recréées par ce downgrade : leur schéma est disponible dans 0001/0002.
