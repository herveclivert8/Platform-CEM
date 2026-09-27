"""newsletter subscribers (double opt-in) and the « show donation totals » transparency setting

Revision ID: 0018
Revises: 0017
Create Date: 2026-09-27

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0018"
down_revision: Union[str, None] = "0017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "association_settings",
        sa.Column("show_donation_totals", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_table(
        "newsletter_subscribers",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("lang", sa.String(8), nullable=False, server_default="fr"),
        sa.Column("status", sa.String(20), nullable=False, server_default="PENDING"),
        sa.Column("confirm_token_hash", sa.String(64), nullable=True),
        sa.Column("confirm_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("unsubscribe_token_hash", sa.String(64), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("unsubscribed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_newsletter_subscribers_email", "newsletter_subscribers", ["email"], unique=True)
    op.create_index("ix_newsletter_subscribers_status", "newsletter_subscribers", ["status"])
    op.create_index("ix_newsletter_subscribers_confirm_token_hash", "newsletter_subscribers", ["confirm_token_hash"])
    op.create_index("ix_newsletter_subscribers_unsubscribe_token_hash", "newsletter_subscribers", ["unsubscribe_token_hash"])


def downgrade() -> None:
    op.drop_table("newsletter_subscribers")
    op.drop_column("association_settings", "show_donation_totals")
