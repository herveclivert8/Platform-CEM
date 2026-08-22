"""
Rate Limiting - Protection contre brute force et abuse
Implémentation simple avec in-memory store (utiliser Redis en production)
"""

from datetime import datetime, timedelta
from typing import Dict, List
from collections import defaultdict
from fastapi import HTTPException, status
import time


class RateLimiter:
    """Rate limiter simple basé sur timestamp"""

    def __init__(self):
        self.attempts: Dict[str, List[float]] = defaultdict(list)
        self.max_attempts = 5
        self.time_window = 900  # 15 minutes en secondes

    def is_allowed(self, key: str) -> bool:
        """
        Vérifier si une clé est autorisée (rate limit non dépassé)
        
        Args:
            key: Identifiant unique (email, IP, etc.)
        
        Returns:
            True si autorisé, False sinon
        """
        now = time.time()
        
        # Nettoyer les anciennes tentatives
        if key in self.attempts:
            self.attempts[key] = [
                attempt for attempt in self.attempts[key]
                if now - attempt < self.time_window
            ]
        
        # Vérifier limit
        if len(self.attempts[key]) >= self.max_attempts:
            return False
        
        # Ajouter tentative
        self.attempts[key].append(now)
        return True

    def get_remaining(self, key: str) -> int:
        """Obtenir le nombre de tentatives restantes"""
        now = time.time()
        if key in self.attempts:
            self.attempts[key] = [
                attempt for attempt in self.attempts[key]
                if now - attempt < self.time_window
            ]
            return max(0, self.max_attempts - len(self.attempts[key]))
        return self.max_attempts

    def reset(self, key: str):
        """Réinitialiser les tentatives pour une clé"""
        if key in self.attempts:
            del self.attempts[key]


# Instance globale
limiter = RateLimiter()


async def check_rate_limit(key: str, operation: str = "login"):
    """
    Vérifier rate limit et lancer exception si dépassé
    
    Args:
        key: Identifiant unique
        operation: Type d'opération (pour les logs)
    
    Raises:
        HTTPException: Si rate limit dépassé
    """
    if not limiter.is_allowed(key):
        remaining = limiter.get_remaining(key)
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Trop de tentatives. Veuillez réessayer dans 15 minutes.",
            headers={
                "Retry-After": "900",
                "X-RateLimit-Remaining": str(remaining),
            },
        )


# Configuration pour différentes opérations
RATE_LIMITS = {
    "login": {"max_attempts": 5, "time_window": 900},  # 5 essais / 15 min
    "register": {"max_attempts": 3, "time_window": 3600},  # 3 essais / 1h
    "password_reset": {"max_attempts": 3, "time_window": 3600},  # 3 essais / 1h
    "api": {"max_attempts": 100, "time_window": 60},  # 100 req / min
}
