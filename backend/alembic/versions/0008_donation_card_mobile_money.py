"""donations: card payment + declared Mobile Money payments, bank transfer removed

Revision ID: 0008
Revises: 0007
Create Date: 2026-09-25

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008"
down_revision: Union[str, None] = "0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BANK_COLUMNS = ("bank_account_holder", "bank_name", "bank_iban", "bank_bic")


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE ne peut pas s'exécuter dans la même transaction que son utilisation
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE payment_method ADD VALUE IF NOT EXISTS 'CARD'")

    op.add_column("donations", sa.Column("donor_name", sa.String(255), nullable=True))
    op.add_column("donations", sa.Column("mobile_operator", sa.String(20), nullable=True))
    # Mobile Money : référence reçue par SMS ; carte : identifiant du paiement chez le prestataire
    op.add_column("donations", sa.Column("transaction_reference", sa.String(64), nullable=True))
    op.add_column("donations", sa.Column("declared_amount", sa.Numeric(12, 2), nullable=True))
    op.add_column("donations", sa.Column("rejection_reason", sa.Text(), nullable=True))
    op.add_column("donations", sa.Column("thank_you_email_sent_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index(
        "uq_donations_operator_transaction",
        "donations",
        ["mobile_operator", "transaction_reference"],
        unique=True,
    )
    # Un don enregistré à la main par un admin peut ne pas avoir d'email
    op.alter_column("donations", "donor_email", existing_type=sa.String(255), nullable=True)

    # Le virement bancaire est supprimé : ses dons (jamais vérifiés) sont rejetés
    op.execute(
        "UPDATE donations SET status = 'REJECTED', "
        "rejection_reason = 'Mode de paiement supprimé (virement bancaire)', status_updated_at = now() "
        "WHERE payment_method = 'BANK_TRANSFER' AND status = 'PENDING'"
    )
    op.drop_index("ix_donations_reference", table_name="donations")
    op.drop_column("donations", "reference")

    for column in BANK_COLUMNS:
        op.drop_column("association_settings", column)


def downgrade() -> None:
    for column in BANK_COLUMNS:
        op.add_column("association_settings", sa.Column(column, sa.String(255), nullable=True))

    op.add_column("donations", sa.Column("reference", sa.String(20), nullable=True))
    op.create_index("ix_donations_reference", "donations", ["reference"], unique=True)

    # Les dons par carte / sans email n'existaient pas avant cette révision
    op.execute("DELETE FROM donations WHERE payment_method = 'CARD' OR donor_email IS NULL")
    op.alter_column("donations", "donor_email", existing_type=sa.String(255), nullable=False)
    op.drop_index("uq_donations_operator_transaction", table_name="donations")
    for column in (
        "thank_you_email_sent_at",
        "rejection_reason",
        "declared_amount",
        "transaction_reference",
        "mobile_operator",
        "donor_name",
    ):
        op.drop_column("donations", column)
    # La valeur 'CARD' reste dans le type payment_method : PostgreSQL ne permet pas de retirer une valeur d'enum.
