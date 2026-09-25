"""
Paiement par carte bancaire.

Le site ne voit jamais les numéros de carte : le navigateur les transforme en "jeton"
(tokenisation, comme Stripe.js / Stripe Elements), et seul ce jeton est envoyé au backend,
qui demande au prestataire de débiter la carte.

Pour l'instant, seul un prestataire SIMULÉ existe : aucun argent ne circule. Pour brancher
un vrai prestataire (ex: Stripe), il suffit d'ajouter une classe qui implémente `charge()`
et de la retourner dans `get_card_provider()` selon `CARD_PAYMENT_PROVIDER`.
"""

import asyncio
import logging
import secrets
from dataclasses import dataclass
from typing import Protocol

from app.core.config import settings

logger = logging.getLogger(__name__)


@dataclass
class PaymentResult:
    success: bool
    payment_id: str | None = None
    # Message affichable au donateur en cas d'échec
    failure_message: str | None = None


class CardPaymentProvider(Protocol):
    name: str
    simulated: bool

    async def charge(self, amount: float, currency: str, token: str, description: str) -> PaymentResult: ...


class SimulatedCardProvider:
    """
    Prestataire factice, pour développer et faire des démonstrations sans carte ni compte.
    Le frontend produit un jeton selon la carte de test saisie (voir lib/payments/simulatedCard.ts).
    """

    name = "simulation"
    simulated = True

    OUTCOMES = {
        "sim_tok_success": PaymentResult(success=True),
        "sim_tok_declined": PaymentResult(success=False, failure_message="Votre carte a été refusée."),
        "sim_tok_insufficient_funds": PaymentResult(
            success=False, failure_message="Fonds insuffisants sur votre carte."
        ),
        "sim_tok_expired": PaymentResult(success=False, failure_message="Votre carte a expiré."),
    }

    async def charge(self, amount: float, currency: str, token: str, description: str) -> PaymentResult:
        await asyncio.sleep(1.2)  # Latence réaliste d'un prestataire
        outcome = self.OUTCOMES.get(token)
        if outcome is None:
            return PaymentResult(success=False, failure_message="Paiement refusé (jeton de carte invalide).")
        if not outcome.success:
            return outcome
        payment_id = "sim_pi_" + secrets.token_hex(10)
        logger.info("[PAIEMENT SIMULÉ] %s %.2f %s — %s", payment_id, amount, currency, description)
        return PaymentResult(success=True, payment_id=payment_id)


def get_card_provider() -> CardPaymentProvider | None:
    """Prestataire de paiement par carte actif, ou None si le paiement par carte est désactivé."""
    provider = settings.CARD_PAYMENT_PROVIDER.lower()
    if provider == "simulation":
        if settings.ENVIRONMENT == "production":
            # Une simulation en production permettrait de créer de faux dons "confirmés"
            logger.error("CARD_PAYMENT_PROVIDER=simulation est refusé en production : paiement par carte désactivé.")
            return None
        return SimulatedCardProvider()
    return None
