"""
Traduire en anglais tous les contenus publiés dont la traduction manque ou est périmée.

    python -m app.translate_all          # affiche ce qui reste à traduire et le coût estimé
    python -m app.translate_all --yes    # lance les traductions

Seuls les textes modifiés depuis leur dernière traduction sont envoyés à l'API : relancer la
commande ne coûte rien quand tout est à jour. Le serveur fait le même rattrapage au démarrage.
"""

import asyncio
import logging
import sys

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.v1.endpoints.posts import TRANSLATED_FIELDS as POST_FIELDS
from app.api.v1.endpoints.projects import TRANSLATED_FIELDS as PROJECT_FIELDS
from app.api.v1.endpoints.publications import TRANSLATED_FIELDS as PUBLICATION_FIELDS
from app.api.v1.endpoints.settings import SETTINGS_ID, _home_sources, about_sources
from app.core.config import settings as app_settings
from app.db.session import AsyncSessionLocal
from app.models import AssociationSettings, ContentTranslation, Post, Project, Publication
from app.models.post import PostStatus
from app.models.project import ProjectReviewStatus
from app.services.translation import TARGET_LANG, is_enabled, provider_name, source_hash, translate_resource

# Estimation grossière (Claude Opus 5 : 5 $ / 25 $ par million de tokens en entrée / sortie)
PRICE_INPUT_PER_TOKEN = 5 / 1_000_000
PRICE_OUTPUT_PER_TOKEN = 25 / 1_000_000
SYSTEM_PROMPT_TOKENS = 250
CHARS_PER_TOKEN = 3.5


async def collect_resources(db: AsyncSession) -> list[tuple[str, int, dict[str, str | None]]]:
    """[(type, id, tous les champs traduisibles)] pour chaque contenu public."""
    resources: list[tuple[str, int, dict[str, str | None]]] = []

    home = await db.get(AssociationSettings, SETTINGS_ID)
    if home is not None:
        resources.append(("home", SETTINGS_ID, _home_sources(home)))
        resources.append(("about", SETTINGS_ID, about_sources(home)))

    posts = await db.execute(select(Post).where(Post.status == PostStatus.PUBLISHED))
    resources += [("post", p.id, {f: getattr(p, f) for f in POST_FIELDS}) for p in posts.scalars()]

    projects = await db.execute(
        select(Project).where(Project.review_status == ProjectReviewStatus.APPROVED, Project.is_visible.is_(True)).options(selectinload(Project.images))
    )
    resources += [("project", p.id, {f: getattr(p, f) for f in PROJECT_FIELDS}) for p in projects.scalars()]

    publications = await db.execute(select(Publication))
    resources += [("publication", p.id, {f: getattr(p, f) for f in PUBLICATION_FIELDS}) for p in publications.scalars()]
    return resources


async def collect_stale(db: AsyncSession) -> list[tuple[str, int, dict[str, str | None], list[str]]]:
    """[(type, id, tous les champs, champs à traduire)] pour chaque contenu public pas à jour."""
    resources = await collect_resources(db)
    rows = await db.execute(select(ContentTranslation).where(ContentTranslation.lang == TARGET_LANG))
    done = {(r.resource_type, r.resource_id, r.field): r.source_hash for r in rows.scalars()}

    stale = []
    for resource_type, resource_id, fields in resources:
        missing = [
            field for field, text in fields.items()
            if text and text.strip() and done.get((resource_type, resource_id, field)) != source_hash(text)
        ]
        if missing:
            stale.append((resource_type, resource_id, fields, missing))
    return stale


async def translate_stale() -> int:
    """Traduire tout ce qui n'est pas à jour. Renvoie le nombre de champs traduits."""
    if not is_enabled():
        return 0
    async with AsyncSessionLocal() as db:
        stale = await collect_stale(db)
    total = 0
    for resource_type, resource_id, fields, _ in stale:
        total += await translate_resource(resource_type, resource_id, fields)
    return total


async def retranslate_terms(terms: set[str]) -> None:
    """
    Retraduire les textes contenant un mot ajouté ou retiré des « mots à ne pas traduire » : leur
    traduction a été faite avec l'ancienne liste. Lancée en tâche de fond après l'enregistrement.
    """
    try:
        folded = [term.casefold() for term in terms]
        async with AsyncSessionLocal() as db:
            resources = await collect_resources(db)
            affected = [
                (resource_type, resource_id, fields, [f for f, text in fields.items() if text and any(t in text.casefold() for t in folded)])
                for resource_type, resource_id, fields in resources
            ]
            affected = [a for a in affected if a[3]]
            for resource_type, resource_id, _, changed in affected:
                await db.execute(
                    delete(ContentTranslation).where(
                        ContentTranslation.resource_type == resource_type,
                        ContentTranslation.resource_id == resource_id,
                        ContentTranslation.field.in_(changed),
                    )
                )
            await db.commit()
        for resource_type, resource_id, fields, _ in affected:
            await translate_resource(resource_type, resource_id, fields)
    except Exception:
        logging.getLogger(__name__).exception("Retraduction après changement des mots à ne pas traduire impossible")


def _estimate_cost(stale) -> tuple[int, int, float]:
    texts = [fields[f] for _, _, fields, missing in stale for f in missing]
    chars = sum(len(t) for t in texts)
    tokens = chars / CHARS_PER_TOKEN
    cost = (tokens + SYSTEM_PROMPT_TOKENS * len(texts)) * PRICE_INPUT_PER_TOKEN + tokens * 1.2 * PRICE_OUTPUT_PER_TOKEN
    return len(texts), chars, cost


async def main() -> None:
    async with AsyncSessionLocal() as db:
        stale = await collect_stale(db)
    count, chars, cost = _estimate_cost(stale)
    if not count:
        print("Toutes les traductions sont à jour.")
        return
    by_type: dict[str, int] = {}
    for resource_type, _, _, missing in stale:
        by_type[resource_type] = by_type.get(resource_type, 0) + len(missing)
    detail = ", ".join(f"{n} {t}" for t, n in sorted(by_type.items()))
    print(f"{count} texte(s) à traduire ({detail}), {chars} caractères.")
    if app_settings.LIBRETRANSLATE_URL:
        print("Traduction avec LibreTranslate : gratuite.")
    else:
        print(f"Coût estimé avec {provider_name()} : environ {cost:.2f} $.")

    if not is_enabled():
        sys.exit("Ni LIBRETRANSLATE_URL ni ANTHROPIC_API_KEY ne sont renseignées : rien n'a été traduit.")
    if "--yes" not in sys.argv:
        sys.exit("Relancez avec --yes pour lancer les traductions : python -m app.translate_all --yes")

    translated = await translate_stale()
    print(f"{translated} texte(s) traduit(s) sur {count}.")
    if translated < count:
        print("Les autres restent en français (service indisponible ou refus) : relancez plus tard.")


if __name__ == "__main__":
    asyncio.run(main())
