"""reactivate members suspended for an unpaid fee whose fee has since been confirmed

La réactivation est désormais automatique à la confirmation de la cotisation : les membres déjà
payés mais encore désactivés (en attente du bouton « Réactiver ») sont réactivés une fois.

Revision ID: 0043
Revises: 0042
Create Date: 2026-11-06

"""
from typing import Sequence, Union

from alembic import op

revision: str = "0043"
down_revision: Union[str, None] = "0042"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Les bienfaiteurs, parrains et marraines désactivés l'ont été par un admin : ils ne sont pas concernés
    op.execute(
        """
        UPDATE users SET membership_status = 'ACTIVE'
        WHERE role::text = 'MEMBER' AND membership_type = 'ACTIVE'
          AND membership_status::text = 'SUSPENDED'
          AND paid_until >= CURRENT_DATE
          AND anonymized_at IS NULL
        """
    )


def downgrade() -> None:
    # Rien à défaire : ces membres avaient payé leur cotisation
    pass
