"""bank account (RIB) shown to donors and members; bank transfers recorded by an admin

Le Super Admin saisit les coordonnées bancaires dans « Coordonnées de paiement ». Elles sont
affichées dans la fenêtre de don et dans le paiement de la cotisation ; un admin enregistre
ensuite le virement reçu (don confirmé d'office, ou paiement de membre confirmé).

Revision ID: 0045
Revises: 0044
Create Date: 2026-11-13

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0045"
down_revision: Union[str, None] = "0044"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

BANK_COLUMNS = ("bank_account_holder", "bank_name", "bank_account_number", "bank_iban", "bank_swift")


def upgrade() -> None:
    # Une nouvelle valeur d'enum doit être validée avant d'être utilisée : hors transaction
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE membership_payment_method ADD VALUE IF NOT EXISTS 'BANK_TRANSFER'")
    for column in BANK_COLUMNS:
        op.add_column("association_settings", sa.Column(column, sa.String(255), nullable=True))


def downgrade() -> None:
    # PostgreSQL ne sait pas retirer une valeur d'enum : les paiements de membres par virement sont
    # supprimés, la valeur BANK_TRANSFER reste dans le type (inutilisée). Les dons par virement
    # restent : BANK_TRANSFER existait déjà pour les anciens dons.
    op.execute("DELETE FROM membership_payments WHERE payment_method = 'BANK_TRANSFER'")
    for column in BANK_COLUMNS:
        op.drop_column("association_settings", column)
