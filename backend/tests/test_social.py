"""Publication automatique sur les réseaux sociaux : déclenchement, simulation, mode réel et requêtes envoyées."""

import json
import uuid

import httpx
import pytest

from app.core.config import settings
from app.services import social
from app.services.social import SharedContent, SocialPublishingError


def _post_payload(**overrides) -> dict:
    payload = {
        "title": f"Actualité {uuid.uuid4().hex[:6]}",
        "content": "<p>Une <strong>belle</strong> journée de distribution.</p>",
        "pillar": "EDUCATION",
        "status": "PUBLISHED",
        "images": [],
    }
    payload.update(overrides)
    return payload


async def _publications_of(client, super_admin, resource_type: str, resource_id: int) -> dict[str, dict]:
    response = await client.get("/social/publications", headers=super_admin, params={"page_size": 100})
    assert response.status_code == 200, response.text
    return {
        p["network"]: p
        for p in response.json()["items"]
        if p["resource_type"] == resource_type and p["resource_id"] == resource_id
    }


async def test_published_post_is_shared_once_in_simulation(client, super_admin, tana_admin, branch_ids):
    created = await client.post(
        f"/branches/{branch_ids['Antananarivo']}/posts", headers=tana_admin, json=_post_payload(images=["/uploads/photo.webp"])
    )
    assert created.status_code == 201, created.text
    post = created.json()

    shared = await _publications_of(client, super_admin, "post", post["id"])
    assert set(shared) == {"FACEBOOK", "INSTAGRAM", "LINKEDIN"}
    assert all(p["status"] == "PUBLISHED" and p["simulated"] for p in shared.values())
    message = shared["FACEBOOK"]["message"]
    assert post["title"] in message and "belle journée" in message
    assert f"/antennes/{branch_ids['Antananarivo']}/actualites/{post['id']}" in message

    # Une modification ne republie pas
    await client.put(f"/posts/{post['id']}", headers=tana_admin, json={"title": "Titre corrigé"})
    again = await _publications_of(client, super_admin, "post", post["id"])
    assert {n: p["id"] for n, p in again.items()} == {n: p["id"] for n, p in shared.items()}


async def test_draft_is_not_shared_and_instagram_needs_a_photo(client, super_admin, tana_admin, branch_ids):
    draft = (await client.post(
        f"/branches/{branch_ids['Antananarivo']}/posts", headers=tana_admin, json=_post_payload(status="DRAFT")
    )).json()
    assert await _publications_of(client, super_admin, "post", draft["id"]) == {}

    # Publication du brouillon (sans photo) : Instagram est ignoré
    await client.put(f"/posts/{draft['id']}", headers=tana_admin, json={"status": "PUBLISHED"})
    shared = await _publications_of(client, super_admin, "post", draft["id"])
    assert shared["FACEBOOK"]["status"] == "PUBLISHED"
    assert shared["INSTAGRAM"]["status"] == "SKIPPED"
    assert "photo" in shared["INSTAGRAM"]["error"]


async def test_branch_admin_project_is_published_and_shared_directly(client, super_admin, tana_admin, branch_ids):
    project = {
        "title": f"Projet {uuid.uuid4().hex[:6]}",
        "summary": "Résumé du projet",
        "description": "<p>Description</p>",
        "pillar": "SOCIAL",
        "phase": "ONGOING",
        "beneficiaries": "Familles",
        "branch_id": branch_ids["Antananarivo"],
    }
    created = (await client.post("/projects", headers=tana_admin, json=project)).json()
    # Publié directement par l'admin de l'antenne, sans validation du Super Admin
    assert created["review_status"] == "APPROVED"
    # Projet en cours : réservé aux membres, donc pas partagé sur les réseaux publics
    assert await _publications_of(client, super_admin, "project", created["id"]) == {}

    # Devenu réalisation : partagé
    completed = await client.put(
        f"/projects/{created['id']}", headers=tana_admin, json={"phase": "COMPLETED", "end_date": "2026-09-30"}
    )
    assert completed.status_code == 200, completed.text
    assert (await client.get(f"/projects/{created['id']}")).status_code == 200
    shared = await _publications_of(client, super_admin, "project", created["id"])
    assert shared["LINKEDIN"]["status"] == "PUBLISHED"
    assert f"/realisations/{created['id']}" in shared["LINKEDIN"]["message"]

    # Le Super Admin est informé, et peut supprimer la publication
    notifications = (await client.get("/notifications", headers=super_admin)).json()["data"]
    assert any(project["title"] in n["message"] for n in notifications)
    assert (await client.delete(f"/projects/{created['id']}", headers=super_admin)).status_code == 204


async def test_super_admin_informed_of_branch_news(client, super_admin, tana_admin, branch_ids):
    post = (await client.post(f"/branches/{branch_ids['Antananarivo']}/posts", headers=tana_admin, json=_post_payload())).json()
    notifications = (await client.get("/notifications", headers=super_admin)).json()["data"]
    assert any(post["title"] in n["message"] for n in notifications)
    assert (await client.delete(f"/posts/{post['id']}", headers=super_admin)).status_code == 204


async def test_social_pages_are_super_admin_only(client, tana_admin, super_admin):
    assert (await client.get("/social/status", headers=tana_admin)).status_code == 403
    assert (await client.get("/social/publications", headers=tana_admin)).status_code == 403
    status = (await client.get("/social/status", headers=super_admin)).json()
    assert status["mode"] == "simulation"
    assert [n["network"] for n in status["networks"]] == ["FACEBOOK", "INSTAGRAM", "LINKEDIN"]


async def test_live_mode_failure_then_retry(client, super_admin, tana_admin, branch_ids, monkeypatch):
    monkeypatch.setattr(settings, "SOCIAL_PUBLISHING", "live")
    monkeypatch.setattr(settings, "FRONTEND_URL", "https://cem.example.org")
    monkeypatch.setattr(settings, "META_PAGE_ID", "123")
    monkeypatch.setattr(settings, "META_PAGE_ACCESS_TOKEN", "token")
    monkeypatch.setattr(settings, "INSTAGRAM_ACCOUNT_ID", "")
    monkeypatch.setattr(settings, "LINKEDIN_ORGANIZATION_ID", "")

    async def failing_facebook(client, content):
        raise SocialPublishingError("Meta a refusé la publication (400) : jeton expiré")

    monkeypatch.setitem(social.PUBLISHERS, "FACEBOOK", failing_facebook)
    post = (await client.post(f"/branches/{branch_ids['Antananarivo']}/posts", headers=tana_admin, json=_post_payload())).json()
    shared = await _publications_of(client, super_admin, "post", post["id"])
    assert shared["FACEBOOK"]["status"] == "FAILED"
    assert "jeton expiré" in shared["FACEBOOK"]["error"]
    assert shared["LINKEDIN"]["status"] == "SKIPPED"  # non configuré

    async def working_facebook(client, content):
        return social.PublishResult(external_id="123_456", external_url="https://www.facebook.com/123_456")

    monkeypatch.setitem(social.PUBLISHERS, "FACEBOOK", working_facebook)
    retried = await client.post(f"/social/publications/{shared['FACEBOOK']['id']}/retry", headers=super_admin)
    assert retried.status_code == 200, retried.text
    assert retried.json()["status"] == "PUBLISHED"
    assert retried.json()["simulated"] is False
    assert retried.json()["external_url"] == "https://www.facebook.com/123_456"
    assert (await client.post(f"/social/publications/{shared['FACEBOOK']['id']}/retry", headers=super_admin)).status_code == 400


async def test_live_mode_refuses_a_local_site(monkeypatch):
    monkeypatch.setattr(settings, "META_PAGE_ID", "123")
    monkeypatch.setattr(settings, "META_PAGE_ACCESS_TOKEN", "token")
    monkeypatch.setattr(settings, "FRONTEND_URL", "http://localhost:5173")
    content = SharedContent("post", 1, "Titre", "Extrait", "http://localhost:5173/x", None)
    status, _, error = await social._publish_to("FACEBOOK", content, "live")
    assert status == "FAILED" and "pas en ligne" in error


# ============================================
# Requêtes envoyées aux réseaux (sans appel réel)
# ============================================

CONTENT = SharedContent("project", 7, "Bibliothèque", "Des livres pour tous", "https://cem.example.org/projets-en-cours/7", "https://cem.example.org/uploads/a.webp")


def _client(handler) -> httpx.AsyncClient:
    return httpx.AsyncClient(transport=httpx.MockTransport(handler))


@pytest.fixture
def meta_settings(monkeypatch):
    monkeypatch.setattr(settings, "META_PAGE_ID", "PAGE")
    monkeypatch.setattr(settings, "META_PAGE_ACCESS_TOKEN", "TOKEN")
    monkeypatch.setattr(settings, "INSTAGRAM_ACCOUNT_ID", "IG")
    monkeypatch.setattr(settings, "LINKEDIN_ORGANIZATION_ID", "42")
    monkeypatch.setattr(settings, "LINKEDIN_ACCESS_TOKEN", "LI")


async def test_facebook_request(meta_settings):
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["url"] = str(request.url)
        seen["form"] = dict(x.split("=", 1) for x in request.content.decode().split("&"))
        return httpx.Response(200, json={"id": "PAGE_99"})

    async with _client(handler) as c:
        result = await social._publish_facebook(c, CONTENT)
    assert seen["url"].endswith("/PAGE/feed")
    assert seen["form"]["access_token"] == "TOKEN"
    assert "link" in seen["form"]
    assert result.external_url == "https://www.facebook.com/PAGE_99"


async def test_instagram_request(meta_settings):
    calls = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.path)
        if request.url.path.endswith("/IG/media"):
            assert "image_url=https" in request.content.decode()
            return httpx.Response(200, json={"id": "CONTAINER"})
        if request.url.path.endswith("/IG/media_publish"):
            assert "creation_id=CONTAINER" in request.content.decode()
            return httpx.Response(200, json={"id": "MEDIA"})
        return httpx.Response(200, json={"permalink": "https://www.instagram.com/p/abc/"})

    async with _client(handler) as c:
        result = await social._publish_instagram(c, CONTENT)
    assert [p.rsplit("/", 1)[-1] for p in calls] == ["media", "media_publish", "MEDIA"]
    assert result.external_url == "https://www.instagram.com/p/abc/"


async def test_instagram_error_is_readable(meta_settings):
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(400, json={"error": {"message": "Invalid image URL"}})

    async with _client(handler) as c:
        with pytest.raises(SocialPublishingError, match="Invalid image URL"):
            await social._publish_instagram(c, CONTENT)


async def test_linkedin_request(meta_settings):
    seen = {}

    def handler(request: httpx.Request) -> httpx.Response:
        seen["headers"] = request.headers
        seen["body"] = json.loads(request.content)
        return httpx.Response(201, headers={"x-restli-id": "urn:li:share:1"})

    async with _client(handler) as c:
        result = await social._publish_linkedin(c, CONTENT)
    assert seen["headers"]["Authorization"] == "Bearer LI"
    assert seen["body"]["author"] == "urn:li:organization:42"
    assert seen["body"]["content"]["article"]["source"] == CONTENT.url
    assert result.external_url == "https://www.linkedin.com/feed/update/urn:li:share:1"
