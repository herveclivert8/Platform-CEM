"""
Référencement et aperçus de partage.

Le site est une application React monopage : les robots des réseaux sociaux (Facebook, LinkedIn,
WhatsApp...) n'exécutent pas le JavaScript et ne verraient que le titre générique. En production,
nginx leur envoie `GET /api/v1/seo/share?path=<url demandée>`, qui renvoie une page minimale avec
le titre, le résumé et l'image de l'élément partagé (balises Open Graph / Twitter). Les visiteurs
humains reçoivent l'application normale.

`sitemap.xml` et `robots.txt` sont générés à partir du contenu publié.
"""

import html
import re
from datetime import datetime
from xml.sax.saxutils import escape as xml_escape

from fastapi import APIRouter, Depends, Query
from fastapi.responses import HTMLResponse, PlainTextResponse, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_db
from app.core.config import settings
from app.models import AssociationSettings, Branch, Post, Project
from app.models.branch import BranchStatus
from app.models.post import PostStatus
from app.models.project import ProjectPhase, ProjectReviewStatus
from app.services.translation import localize, normalize_lang

router = APIRouter(prefix="/seo", tags=["seo"])

SITE_NAME = "Club Excellence Madagascar"
# Même photo par défaut que la couverture d'accueil (frontend/src/components/home/Hero.tsx)
DEFAULT_IMAGE = "https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200&q=80&auto=format&fit=crop"
DESCRIPTION_MAX = 200

TEXTS = {
    "fr": {
        "home": "Faire émerger l'excellence et le développement durable à Madagascar.",
        "home_desc": "Un réseau international engagé pour l'éducation, l'aide sociale, l'entrepreneuriat et l'insertion par le sport.",
        "branches": "Nos antennes",
        "branches_desc": "Les antennes du CEM à Madagascar et à l'international.",
        "achievements": "Nos réalisations",
        "achievements_desc": "Les projets menés à bien par nos antennes, au service des communautés à Madagascar.",
        "ongoing": "Projets en cours",
        "ongoing_desc": "Les actions actuellement menées par nos antennes, à soutenir dès aujourd'hui.",
        "transparency": "Transparence",
        "transparency_desc": "Chiffres clés, bilans annuels et utilisation des dons du CEM.",
        "news": "Actualités",
        "branch": "Antenne de {name}",
    },
    "en": {
        "home": "Fostering excellence and sustainable development in Madagascar.",
        "home_desc": "An international network committed to education, social aid, entrepreneurship and social inclusion through sport.",
        "branches": "Our branches",
        "branches_desc": "CEM branches in Madagascar and around the world.",
        "achievements": "Our achievements",
        "achievements_desc": "Projects delivered by our branches, serving communities in Madagascar.",
        "ongoing": "Ongoing projects",
        "ongoing_desc": "Actions our branches are carrying out right now — support them today.",
        "transparency": "Transparency",
        "transparency_desc": "Key figures, annual reports and how CEM uses donations.",
        "news": "News",
        "branch": "{name} branch",
    },
}


def _plain_text(value: str | None, limit: int = DESCRIPTION_MAX) -> str:
    """Texte brut d'un contenu HTML, raccourci pour une description d'aperçu."""
    text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()
    return text if len(text) <= limit else text[: limit - 1].rsplit(" ", 1)[0] + "…"


def _absolute(url: str | None) -> str | None:
    if not url:
        return None
    return url if url.startswith(("http://", "https://")) else settings.FRONTEND_URL.rstrip("/") + "/" + url.lstrip("/")


async def _translated(db: AsyncSession, resource_type: str, resource_id: int, fields: dict, lang: str) -> dict:
    """Champs traduits à jour (anglais), sinon le français."""
    translations = (await localize(db, resource_type, {resource_id: fields}, lang)).get(resource_id, {})
    return {k: translations.get(k) or v for k, v in fields.items()}


async def _resolve(db: AsyncSession, path: str, lang: str) -> dict:
    """Titre, description et image de la page publique `path` (page d'accueil à défaut)."""
    t = TEXTS[lang]
    home = await db.get(AssociationSettings, 1)
    default_image = (home.hero_image_url if home else None) or DEFAULT_IMAGE
    page = {"title": t["home"], "description": t["home_desc"], "image": default_image, "type": "website"}

    if home and lang == "fr" and (home.hero_title_fr or home.hero_subtitle_fr):
        page["title"] = home.hero_title_fr or page["title"]
        page["description"] = home.hero_subtitle_fr or page["description"]

    parts = [p for p in path.split("?")[0].split("/") if p]
    static = {
        ("antennes",): ("branches", "branches_desc"),
        ("realisations",): ("achievements", "achievements_desc"),
        ("projets-en-cours",): ("ongoing", "ongoing_desc"),
        ("transparence",): ("transparency", "transparency_desc"),
    }
    if tuple(parts) in static:
        title_key, desc_key = static[tuple(parts)]
        page.update(title=t[title_key], description=t[desc_key])
        return page

    def num(value: str) -> int | None:
        return int(value) if value.isdigit() else None

    # /realisations/{id} ou /projets-en-cours/{id}
    if len(parts) == 2 and parts[0] in ("realisations", "projets-en-cours") and num(parts[1]):
        project = await db.scalar(
            select(Project).options(selectinload(Project.images)).where(
                Project.id == num(parts[1]), Project.review_status == ProjectReviewStatus.APPROVED,
                Project.is_visible.is_(True),
            )
        )
        if project:
            text = await _translated(db, "project", project.id, {"title": project.title, "summary": project.summary}, lang)
            section = t["achievements" if project.phase == ProjectPhase.COMPLETED else "ongoing"]
            page.update(
                title=f"{text['title']} — {section}",
                description=_plain_text(text["summary"]),
                image=(project.images[0].url if project.images else None) or default_image,
                type="article",
            )
        return page

    # /antennes/{id}/actualites/{postId}
    if len(parts) == 4 and parts[0] == "antennes" and parts[2] == "actualites" and num(parts[3]):
        post = await db.scalar(
            select(Post).options(selectinload(Post.images)).where(
                Post.id == num(parts[3]), Post.status == PostStatus.PUBLISHED
            )
        )
        if post:
            text = await _translated(db, "post", post.id, {"title": post.title, "content": post.content}, lang)
            page.update(
                title=f"{text['title']} — {t['news']}",
                description=_plain_text(text["content"]),
                image=(post.images[0].url if post.images else None) or default_image,
                type="article",
            )
        return page

    # /antennes/{id}, /antennes/{id}/actualites
    branch = None
    if len(parts) in (2, 3) and parts[0] == "antennes" and num(parts[1]):
        branch = await db.get(Branch, num(parts[1]))
    if branch and branch.status != BranchStatus.PENDING:
        if lang == "fr" and branch.name[:1].upper() in "AEIOUYÂÉÈÊÎÔÛH":
            name = f"Antenne d’{branch.name}"  # élision : « Antenne d’Antananarivo »
        else:
            name = t["branch"].format(name=branch.name)
        page.update(
            title=name if len(parts) != 3 else f"{t['news']} — {name}",
            description=_plain_text(branch.description) or page["description"],
            image=branch.banner_url or branch.logo_url or default_image,
        )
    return page


@router.get("/share", response_class=HTMLResponse)
async def share_preview(
    path: str = Query("/", max_length=500, description="URL publique demandée (ex. /realisations/3)"),
    lang: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Page minimale avec les balises d'aperçu (Open Graph / Twitter), pour les robots de partage."""
    language = normalize_lang(lang)
    page = await _resolve(db, path if path.startswith("/") else "/" + path, language)
    url = settings.FRONTEND_URL.rstrip("/") + (path if path.startswith("/") else "/" + path)
    title = f"{page['title']} — {SITE_NAME}"
    e = lambda v: html.escape(v or "", quote=True)  # noqa: E731
    image = _absolute(page["image"])
    locale, alternate = ("en_GB", "fr_FR") if language == "en" else ("fr_FR", "en_GB")
    body = f"""<!doctype html>
<html lang="{language}">
<head>
<meta charset="utf-8">
<title>{e(title)}</title>
<meta name="description" content="{e(page['description'])}">
<link rel="canonical" href="{e(url)}">
<meta property="og:site_name" content="{SITE_NAME}">
<meta property="og:type" content="{page['type']}">
<meta property="og:title" content="{e(page['title'])}">
<meta property="og:description" content="{e(page['description'])}">
<meta property="og:url" content="{e(url)}">
<meta property="og:image" content="{e(image)}">
<meta property="og:locale" content="{locale}">
<meta property="og:locale:alternate" content="{alternate}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{e(page['title'])}">
<meta name="twitter:description" content="{e(page['description'])}">
<meta name="twitter:image" content="{e(image)}">
</head>
<body><h1>{e(page['title'])}</h1><p>{e(page['description'])}</p><p><a href="{e(url)}">{e(url)}</a></p></body>
</html>"""
    return HTMLResponse(body, headers={"Cache-Control": "public, max-age=600"})


@router.get("/sitemap.xml")
async def sitemap(db: AsyncSession = Depends(get_db)):
    """Plan du site : pages publiques et contenus publiés (servi à la racine par nginx / Vite)."""
    base = settings.FRONTEND_URL.rstrip("/")
    urls: list[tuple[str, datetime | None]] = [
        (p, None) for p in ("/", "/antennes", "/realisations", "/projets-en-cours", "/transparence")
    ]
    branches = (await db.execute(
        select(Branch).where(Branch.status == BranchStatus.ACTIVE)
    )).scalars().all()
    urls += [(f"/antennes/{b.id}", b.updated_at) for b in branches]
    urls += [(f"/antennes/{b.id}/actualites", None) for b in branches]
    active_ids = {b.id for b in branches}
    posts = (await db.execute(select(Post).where(Post.status == PostStatus.PUBLISHED))).scalars().all()
    urls += [(f"/antennes/{p.branch_id}/actualites/{p.id}", p.updated_at) for p in posts if p.branch_id in active_ids]
    projects = (await db.execute(
        select(Project).where(Project.review_status == ProjectReviewStatus.APPROVED, Project.is_visible.is_(True))
    )).scalars().all()
    urls += [
        (f"/{'realisations' if p.phase == ProjectPhase.COMPLETED else 'projets-en-cours'}/{p.id}", p.updated_at)
        for p in projects
    ]
    entries = "".join(
        f"<url><loc>{xml_escape(base + path)}</loc>"
        + (f"<lastmod>{updated.date().isoformat()}</lastmod>" if updated else "")
        + "</url>"
        for path, updated in urls
    )
    xml = f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{entries}</urlset>'
    return Response(xml, media_type="application/xml", headers={"Cache-Control": "public, max-age=3600"})


@router.get("/robots.txt", response_class=PlainTextResponse)
async def robots():
    """Robots : tout le site public est indexable, sauf le back-office et l'API."""
    base = settings.FRONTEND_URL.rstrip("/")
    return PlainTextResponse(
        "User-agent: *\nDisallow: /admin\nDisallow: /api/\nDisallow: /login\n"
        "Disallow: /forgot-password\nDisallow: /reset-password\n\n"
        f"Sitemap: {base}/sitemap.xml\n"
    )
