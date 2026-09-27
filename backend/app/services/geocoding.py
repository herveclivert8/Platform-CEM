"""
Géolocalisation des antennes (ville + pays → latitude / longitude) via OpenStreetMap Nominatim.

Utilisée quand une antenne est créée ou modifiée sans coordonnées (ville saisie à la main plutôt que
choisie dans l'autocomplétion) : sans position, l'antenne n'apparaîtrait pas sur la carte.
Politique d'usage de Nominatim : User-Agent identifiant, 1 requête par seconde au maximum.
"""

import asyncio
import logging

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.branch import Branch

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "CEM-Platform/1.0 (Club Excellence Madagascar)"
_lock = asyncio.Lock()  # sérialise les appels pour respecter 1 requête/s


async def geocode_city(city: str, country: str | None) -> tuple[float, float] | None:
    """(latitude, longitude) de la ville, ou None si introuvable / service indisponible."""
    if not city.strip():
        return None
    params = {"city": city.strip()}
    if country:
        params["country"] = country.strip()
    return await _search(params, label=f"{city}, {country}")


async def geocode_address(address: str) -> tuple[float, float] | None:
    """(latitude, longitude) d'une adresse complète (ex. le siège), ou None."""
    return await _search({"q": address.strip()}, label=address) if address.strip() else None


async def _search(query: dict, label: str) -> tuple[float, float] | None:
    if not settings.GEOCODING_ENABLED:
        return None
    params = {"format": "json", "limit": 1, **query}
    async with _lock:
        try:
            async with httpx.AsyncClient(timeout=10, headers={"User-Agent": USER_AGENT}) as client:
                response = await client.get(NOMINATIM_URL, params=params)
                response.raise_for_status()
                results = response.json()
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Géolocalisation impossible pour %s : %s", label, exc)
            return None
        finally:
            await asyncio.sleep(1)
    if not results:
        logger.info("Aucune position trouvée pour %s", label)
        return None
    return float(results[0]["lat"]), float(results[0]["lon"])


async def fill_missing_coordinates(branch: Branch) -> bool:
    """Compléter la position d'une antenne qui n'en a pas. True si elle a été trouvée."""
    if branch.latitude is not None and branch.longitude is not None:
        return False
    coords = await geocode_city(branch.name, branch.country)
    if coords is None:
        return False
    branch.latitude, branch.longitude = coords
    return True


async def backfill_branch_coordinates(db: AsyncSession) -> int:
    """Rattrapage : géolocaliser les antennes existantes sans position. Renvoie le nombre complété."""
    result = await db.execute(
        select(Branch).where((Branch.latitude.is_(None)) | (Branch.longitude.is_(None)))
    )
    filled = 0
    for branch in result.scalars().all():
        if await fill_missing_coordinates(branch):
            filled += 1
    if filled:
        await db.commit()
        logger.info("Position ajoutée à %d antenne(s)", filled)
    return filled
