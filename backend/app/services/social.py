"""
Publication automatique sur les réseaux sociaux (Facebook, Instagram, LinkedIn).

Quand une actualité est publiée, ou qu'une réalisation est validée et visible, le contenu
est partagé une fois sur chaque réseau (titre, extrait, lien vers le site, première photo).
Chaque tentative est enregistrée dans SocialPublication (historique visible par le Super Admin).

Modes (SOCIAL_PUBLISHING) :
- "simulation" : rien n'est envoyé ; l'historique montre ce qui aurait été publié. Refusé en
  production (de fausses publications « réussies » induiraient en erreur) ;
- "live" : vraie publication, sur chaque réseau dont les identifiants sont renseignés ;
- "disabled" : aucune publication.

APIs utilisées (identifiants dans app/core/config.py) :
- Facebook : API Graph, POST /{page-id}/feed (message + lien) avec un jeton de Page ;
- Instagram : API Graph, conteneur POST /{ig-id}/media puis POST /{ig-id}/media_publish.
  Instagram exige une image, téléchargée par Meta depuis le site : le site doit être en ligne ;
- LinkedIn : API Posts (POST /rest/posts) au nom de la page entreprise, avec aperçu du lien.
"""

import html
import logging
import re
from dataclasses import dataclass
from urllib.parse import urlparse

import httpx
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.session import AsyncSessionLocal
from app.models import Post, Project, SocialPublication
from app.models.branch import BranchStatus
from app.models.post import PostStatus
from app.models.project import ProjectPhase, ProjectReviewStatus

logger = logging.getLogger(__name__)

NETWORK_LABELS = {"FACEBOOK": "Facebook", "INSTAGRAM": "Instagram", "LINKEDIN": "LinkedIn"}
EXCERPT_MAX = 280
INSTAGRAM_CAPTION_MAX = 2200
LINKEDIN_COMMENTARY_MAX = 3000
TIMEOUT = httpx.Timeout(30.0)


class SocialPublishingError(Exception):
    """Refus ou erreur d'un réseau, avec un message lisible pour l'admin."""


@dataclass
class SharedContent:
    resource_type: str
    resource_id: int
    title: str
    excerpt: str
    url: str
    image_url: str | None

    @property
    def message(self) -> str:
        return f"{self.title}\n\n{self.excerpt}\n\n{self.url}".strip()


@dataclass
class PublishResult:
    external_id: str | None = None
    external_url: str | None = None


# ============================================
# Mode et configuration
# ============================================


def publishing_mode() -> str:
    mode = settings.SOCIAL_PUBLISHING.lower()
    if mode == "simulation" and settings.ENVIRONMENT == "production":
        return "disabled"
    return mode if mode in ("simulation", "live") else "disabled"


def network_configured(network: str) -> bool:
    if network == "FACEBOOK":
        return bool(settings.META_PAGE_ID and settings.META_PAGE_ACCESS_TOKEN)
    if network == "INSTAGRAM":
        return bool(settings.INSTAGRAM_ACCOUNT_ID and settings.META_PAGE_ACCESS_TOKEN)
    return bool(settings.LINKEDIN_ORGANIZATION_ID and settings.LINKEDIN_ACCESS_TOKEN)


def _site_is_public() -> bool:
    """Les réseaux téléchargent images et aperçus depuis le site : impossible depuis localhost."""
    host = urlparse(settings.FRONTEND_URL).hostname or ""
    return host not in ("localhost", "127.0.0.1", "0.0.0.0") and not host.endswith(".local")


# ============================================
# Contenu à partager
# ============================================


def _plain_text(value: str | None, limit: int = EXCERPT_MAX) -> str:
    text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", value or ""))).strip()
    return text if len(text) <= limit else text[: limit - 1].rsplit(" ", 1)[0] + "…"


def _absolute(path: str | None) -> str | None:
    if not path:
        return None
    if path.startswith(("http://", "https://")):
        return path
    return settings.FRONTEND_URL.rstrip("/") + "/" + path.lstrip("/")


async def load_shared_content(db: AsyncSession, resource_type: str, resource_id: int) -> SharedContent | None:
    """Contenu à partager, ou None s'il n'est pas (ou plus) public."""
    if resource_type == "post":
        post = await db.scalar(
            select(Post).options(selectinload(Post.images), selectinload(Post.branch)).where(Post.id == resource_id)
        )
        if not post or post.status != PostStatus.PUBLISHED or post.branch.status == BranchStatus.PENDING:
            return None
        return SharedContent(
            resource_type="post",
            resource_id=post.id,
            title=post.title,
            excerpt=_plain_text(post.content),
            url=_absolute(f"/antennes/{post.branch_id}/actualites/{post.id}"),
            image_url=_absolute(post.images[0].url) if post.images else None,
        )

    project = await db.scalar(
        select(Project).options(selectinload(Project.images)).where(Project.id == resource_id)
    )
    # Les projets en cours sont réservés aux membres : partagés seulement une fois réalisés
    if (
        not project
        or project.review_status != ProjectReviewStatus.APPROVED
        or not project.is_visible
        or project.phase != ProjectPhase.COMPLETED
    ):
        return None
    return SharedContent(
        resource_type="project",
        resource_id=project.id,
        title=project.title,
        excerpt=_plain_text(project.summary),
        url=_absolute(f"/realisations/{project.id}"),
        image_url=_absolute(project.images[0].url) if project.images else None,
    )


# ============================================
# Réseaux
# ============================================


def _graph_url(path: str) -> str:
    return f"https://graph.facebook.com/{settings.META_GRAPH_VERSION}/{path}"


def _graph_error(response: httpx.Response) -> SocialPublishingError:
    try:
        message = response.json()["error"]["message"]
    except Exception:
        message = response.text[:300]
    return SocialPublishingError(f"Meta a refusé la publication ({response.status_code}) : {message}")


async def _publish_facebook(client: httpx.AsyncClient, content: SharedContent) -> PublishResult:
    response = await client.post(
        _graph_url(f"{settings.META_PAGE_ID}/feed"),
        data={
            "message": f"{content.title}\n\n{content.excerpt}",
            "link": content.url,
            "access_token": settings.META_PAGE_ACCESS_TOKEN,
        },
    )
    if response.status_code != 200:
        raise _graph_error(response)
    post_id = response.json()["id"]
    return PublishResult(external_id=post_id, external_url=f"https://www.facebook.com/{post_id}")


async def _publish_instagram(client: httpx.AsyncClient, content: SharedContent) -> PublishResult:
    ig_id = settings.INSTAGRAM_ACCOUNT_ID
    token = settings.META_PAGE_ACCESS_TOKEN
    # Les liens ne sont pas cliquables dans une légende Instagram : l'adresse est donnée en texte
    caption = content.message[:INSTAGRAM_CAPTION_MAX]
    container = await client.post(
        _graph_url(f"{ig_id}/media"),
        data={"image_url": content.image_url, "caption": caption, "access_token": token},
    )
    if container.status_code != 200:
        raise _graph_error(container)
    published = await client.post(
        _graph_url(f"{ig_id}/media_publish"),
        data={"creation_id": container.json()["id"], "access_token": token},
    )
    if published.status_code != 200:
        raise _graph_error(published)
    media_id = published.json()["id"]

    permalink = None
    details = await client.get(_graph_url(media_id), params={"fields": "permalink", "access_token": token})
    if details.status_code == 200:
        permalink = details.json().get("permalink")
    return PublishResult(external_id=media_id, external_url=permalink)


async def _publish_linkedin(client: httpx.AsyncClient, content: SharedContent) -> PublishResult:
    response = await client.post(
        "https://api.linkedin.com/rest/posts",
        headers={
            "Authorization": f"Bearer {settings.LINKEDIN_ACCESS_TOKEN}",
            "LinkedIn-Version": settings.LINKEDIN_API_VERSION,
            "X-Restli-Protocol-Version": "2.0.0",
        },
        json={
            "author": f"urn:li:organization:{settings.LINKEDIN_ORGANIZATION_ID}",
            "commentary": f"{content.title}\n\n{content.excerpt}"[:LINKEDIN_COMMENTARY_MAX],
            "visibility": "PUBLIC",
            "distribution": {"feedDistribution": "MAIN_FEED", "targetEntities": [], "thirdPartyDistributionChannels": []},
            "content": {"article": {"source": content.url, "title": content.title, "description": content.excerpt}},
            "lifecycleState": "PUBLISHED",
            "isReshareDisabledByAuthor": False,
        },
    )
    if response.status_code not in (200, 201):
        try:
            message = response.json().get("message") or response.text[:300]
        except Exception:
            message = response.text[:300]
        raise SocialPublishingError(f"LinkedIn a refusé la publication ({response.status_code}) : {message}")
    urn = response.headers.get("x-restli-id")
    return PublishResult(external_id=urn, external_url=f"https://www.linkedin.com/feed/update/{urn}" if urn else None)


PUBLISHERS = {"FACEBOOK": _publish_facebook, "INSTAGRAM": _publish_instagram, "LINKEDIN": _publish_linkedin}


# ============================================
# Publication
# ============================================


async def _publish_to(network: str, content: SharedContent, mode: str) -> tuple[str, PublishResult, str | None]:
    """(statut, résultat, erreur) d'une publication sur un réseau."""
    if network == "INSTAGRAM" and not content.image_url:
        return "SKIPPED", PublishResult(), "Instagram exige une photo : ce contenu n'en a pas."
    if mode == "simulation":
        return "PUBLISHED", PublishResult(), None
    if not network_configured(network):
        return "SKIPPED", PublishResult(), f"{NETWORK_LABELS[network]} n'est pas configuré sur le serveur."
    if not _site_is_public():
        return "FAILED", PublishResult(), (
            "Le site n'est pas en ligne (FRONTEND_URL pointe vers une adresse locale) : "
            f"{NETWORK_LABELS[network]} ne peut pas accéder au lien et aux images."
        )
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            return "PUBLISHED", await PUBLISHERS[network](client, content), None
    except SocialPublishingError as e:
        return "FAILED", PublishResult(), str(e)
    except httpx.HTTPError as e:
        return "FAILED", PublishResult(), f"{NETWORK_LABELS[network]} injoignable : {e.__class__.__name__}"


async def share_resource(resource_type: str, resource_id: int) -> None:
    """Partager un contenu devenu public sur chaque réseau où il ne l'a pas encore été."""
    mode = publishing_mode()
    if mode == "disabled":
        return
    async with AsyncSessionLocal() as db:
        content = await load_shared_content(db, resource_type, resource_id)
        if content is None:
            return
        done = set(
            (
                await db.execute(
                    select(SocialPublication.network).where(
                        SocialPublication.resource_type == resource_type,
                        SocialPublication.resource_id == resource_id,
                    )
                )
            ).scalars()
        )
        for network in NETWORK_LABELS:
            if network in done:
                continue
            status, result, error = await _publish_to(network, content, mode)
            db.add(
                SocialPublication(
                    resource_type=resource_type,
                    resource_id=resource_id,
                    network=network,
                    status=status,
                    title=content.title[:255],
                    message=content.message,
                    external_id=result.external_id,
                    external_url=result.external_url,
                    error=error,
                    simulated=mode == "simulation" and status == "PUBLISHED",
                )
            )
            try:
                await db.commit()
            except IntegrityError:
                # Partage déjà lancé en parallèle (deux enregistrements rapprochés) : on garde le premier
                await db.rollback()
            if status == "FAILED":
                logger.warning("Publication %s de %s #%s échouée : %s", network, resource_type, resource_id, error)


async def delete_social_history(db: AsyncSession, resource_type: str, resource_ids: list[int]) -> None:
    """Contenu supprimé : oublier ses partages (sinon un nouveau contenu réutilisant le même
    identifiant, possible avec SQLite, passerait pour déjà partagé). Les publications restent sur les réseaux."""
    await db.execute(
        delete(SocialPublication).where(
            SocialPublication.resource_type == resource_type, SocialPublication.resource_id.in_(resource_ids)
        )
    )


async def safe_share_resource(resource_type: str, resource_id: int) -> None:
    try:
        await share_resource(resource_type, resource_id)
    except Exception:
        logger.exception("Publication sur les réseaux de %s #%s échouée", resource_type, resource_id)


async def retry_publication(db: AsyncSession, publication: SocialPublication) -> SocialPublication:
    """Nouvelle tentative pour une publication en échec (ex. après correction de la configuration)."""
    content = await load_shared_content(db, publication.resource_type, publication.resource_id)
    if content is None:
        publication.status = "SKIPPED"
        publication.error = "Ce contenu n'est plus public sur le site."
    else:
        status, result, error = await _publish_to(publication.network, content, publishing_mode())
        publication.status = status
        publication.title = content.title[:255]
        publication.message = content.message
        publication.external_id = result.external_id
        publication.external_url = result.external_url
        publication.error = error
        publication.simulated = publishing_mode() == "simulation" and status == "PUBLISHED"
    await db.commit()
    await db.refresh(publication)
    return publication
