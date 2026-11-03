"""
Numéros d'adhérent : les 4 premières lettres de l'antenne (majuscules, sans accents) suivies du
rang d'inscription sur 4 chiffres. Le 45e membre validé de l'antenne Paris reçoit PARI0045.

Le rang est compté par préfixe, et non par antenne : deux antennes aux mêmes 4 premières lettres
(« Paris » et « Paris Sud ») partagent la numérotation, ce qui garde chaque numéro unique.
"""

import unicodedata
import zlib

from sqlalchemy import func, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User

PREFIX_LENGTH = 4
DIGITS = 4


def branch_prefix(branch_name: str) -> str:
    """« Antananarivo » → ANTA, « Île-de-France » → ILED (lettres seules, sans accents)."""
    ascii_name = unicodedata.normalize("NFKD", branch_name).encode("ascii", "ignore").decode()
    letters = "".join(c for c in ascii_name if c.isalpha()).upper()
    return letters[:PREFIX_LENGTH] or "CEM"


def format_member_number(prefix: str, rank: int) -> str:
    return f"{prefix}{rank:0{DIGITS}d}"


async def assign_member_number(db: AsyncSession, user: User, branch_name: str) -> str:
    """Attribuer au membre le prochain numéro de son antenne (sans commit). Ne change pas un numéro existant."""
    if user.member_number:
        return user.member_number
    prefix = branch_prefix(branch_name)
    # Deux validations simultanées dans la même antenne ne doivent pas obtenir le même rang
    await db.execute(text("SELECT pg_advisory_xact_lock(:key)"), {"key": zlib.crc32(f"member_number:{prefix}".encode())})
    numbers = await db.scalars(
        select(User.member_number).where(User.member_number.like(f"{prefix}%"), func.length(User.member_number) > len(prefix))
    )
    ranks = [int(n[len(prefix):]) for n in numbers if n[len(prefix):].isdigit()]
    user.member_number = format_member_number(prefix, max(ranks, default=0) + 1)
    return user.member_number
