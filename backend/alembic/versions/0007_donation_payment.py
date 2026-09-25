"""donation payment flow: status, method, currency, reference + payment details in settings

Revision ID: 0007
Revises: 0006
Create Date: 2026-09-25

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007"
down_revision: Union[str, None] = "0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

donation_status_enum = sa.Enum("PENDING", "CONFIRMED", "REJECTED", name="donation_status")
payment_method_enum = sa.Enum("BANK_TRANSFER", "MOBILE_MONEY", name="payment_method")


def upgrade() -> None:
    donation_status_enum.create(op.get_bind(), checkfirst=True)
    payment_method_enum.create(op.get_bind(), checkfirst=True)

    # Les dons existants n'ont jamais été vérifiés : ils passent "en attente" pour revue par un admin.
    op.add_column(
        "donations",
        sa.Column("status", donation_status_enum, nullable=False, server_default="PENDING"),
    )
    op.add_column(
        "donations",
        sa.Column("payment_method", payment_method_enum, nullable=False, server_default="BANK_TRANSFER"),
    )
    op.add_column("donations", sa.Column("currency", sa.String(3), nullable=False, server_default="EUR"))
    # Les montants en ariary sont bien plus grands qu'en euros
    op.alter_column("donations", "amount", type_=sa.Numeric(12, 2), existing_nullable=False)
    op.add_column("donations", sa.Column("reference", sa.String(20), nullable=True))
    op.add_column("donations", sa.Column("donor_phone", sa.String(30), nullable=True))
    op.add_column("donations", sa.Column("status_updated_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_donations_reference", "donations", ["reference"], unique=True)
    op.create_index("ix_donations_status", "donations", ["status"])

    for column in (
        "bank_account_holder",
        "bank_name",
        "bank_iban",
        "bank_bic",
        "mobile_money_holder",
        "mvola_number",
        "orange_money_number",
        "airtel_money_number",
    ):
        op.add_column("association_settings", sa.Column(column, sa.String(255), nullable=True))


def downgrade() -> None:
    for column in (
        "airtel_money_number",
        "orange_money_number",
        "mvola_number",
        "mobile_money_holder",
        "bank_bic",
        "bank_iban",
        "bank_name",
        "bank_account_holder",
    ):
        op.drop_column("association_settings", column)

    op.drop_index("ix_donations_status", table_name="donations")
    op.drop_index("ix_donations_reference", table_name="donations")
    op.alter_column("donations", "amount", type_=sa.Numeric(10, 2), existing_nullable=False)
    for column in ("status_updated_at", "donor_phone", "reference", "currency", "payment_method", "status"):
        op.drop_column("donations", column)

    payment_method_enum.drop(op.get_bind(), checkfirst=True)
    donation_status_enum.drop(op.get_bind(), checkfirst=True)
