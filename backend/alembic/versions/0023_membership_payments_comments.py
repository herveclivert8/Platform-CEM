"""membership payments (registration fee, monthly dues), paid_until on users, project comments

Revision ID: 0023
Revises: 0022
Create Date: 2026-10-08

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "0023"
down_revision: Union[str, None] = "0022"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# create_type=False : les types sont créés explicitement (et une seule fois) dans upgrade()
payment_kind = postgresql.ENUM("REGISTRATION", "MONTHLY", name="membership_payment_kind", create_type=False)
payment_method = postgresql.ENUM("CARD", "MOBILE_MONEY", "CASH", name="membership_payment_method", create_type=False)
payment_status = postgresql.ENUM("PENDING", "CONFIRMED", "REJECTED", name="membership_payment_status", create_type=False)


def upgrade() -> None:
    bind = op.get_bind()
    for enum_type in (payment_kind, payment_method, payment_status):
        enum_type.create(bind, checkfirst=True)

    op.add_column("users", sa.Column("paid_until", sa.Date(), nullable=True))

    op.create_table(
        "membership_payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("branch_id", sa.Integer(), sa.ForeignKey("branches.id", ondelete="SET NULL"), nullable=True),
        sa.Column("kind", payment_kind, nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("currency", sa.String(3), nullable=False),
        sa.Column("payment_method", payment_method, nullable=False),
        sa.Column("mobile_operator", sa.String(20), nullable=True),
        sa.Column("sender_phone", sa.String(30), nullable=True),
        sa.Column("transaction_reference", sa.String(64), nullable=True),
        sa.Column("status", payment_status, nullable=False, server_default="PENDING"),
        sa.Column("rejection_reason", sa.Text(), nullable=True),
        sa.Column("period_start", sa.Date(), nullable=True),
        sa.Column("period_end", sa.Date(), nullable=True),
        sa.Column("reviewed_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_membership_payments_user_id", "membership_payments", ["user_id"])
    op.create_index("ix_membership_payments_branch_id", "membership_payments", ["branch_id"])
    op.create_index("ix_membership_payments_status", "membership_payments", ["status"])

    op.create_table(
        "project_comments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("project_id", sa.Integer(), sa.ForeignKey("projects.id", ondelete="CASCADE"), nullable=False),
        sa.Column("author_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("parent_id", sa.Integer(), sa.ForeignKey("project_comments.id", ondelete="CASCADE"), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_project_comments_project_id", "project_comments", ["project_id"])
    op.create_index("ix_project_comments_author_id", "project_comments", ["author_id"])
    op.create_index("ix_project_comments_parent_id", "project_comments", ["parent_id"])


def downgrade() -> None:
    op.drop_table("project_comments")
    op.drop_table("membership_payments")
    op.drop_column("users", "paid_until")
    bind = op.get_bind()
    for enum_type in (payment_status, payment_method, payment_kind):
        enum_type.drop(bind, checkfirst=True)
