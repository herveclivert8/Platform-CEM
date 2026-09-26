"""Réglages globaux : couverture de la page d'accueil."""

from tests.conftest import auth

HERO_FIELDS = ["hero_image_url", "hero_badge_fr", "hero_badge_en", "hero_title_fr", "hero_title_en",
               "hero_subtitle_fr", "hero_subtitle_en"]


async def test_home_hero_defaults_to_empty(client, world):
    r = await client.get("/api/v1/settings/home-hero")
    assert r.status_code == 200
    assert all(r.json()[f] is None for f in HERO_FIELDS)


async def test_super_admin_customizes_home_hero(client, world):
    r = await client.put("/api/v1/settings/home-hero", headers=auth(world.super_admin), json={
        "hero_image_url": "/uploads/couverture.jpg",
        "hero_title_fr": "  Ensemble pour Madagascar  ",
        "hero_title_en": "Together for Madagascar",
    })
    assert r.status_code == 200

    public = (await client.get("/api/v1/settings/home-hero")).json()
    assert public["hero_image_url"] == "/uploads/couverture.jpg"
    assert public["hero_title_fr"] == "Ensemble pour Madagascar"  # espaces retirés
    assert public["hero_subtitle_fr"] is None  # non envoyé : inchangé


async def test_emptied_field_goes_back_to_default(client, world):
    headers = auth(world.super_admin)
    await client.put("/api/v1/settings/home-hero", headers=headers, json={"hero_title_fr": "Titre"})
    await client.put("/api/v1/settings/home-hero", headers=headers, json={"hero_title_fr": "  "})
    assert (await client.get("/api/v1/settings/home-hero")).json()["hero_title_fr"] is None


async def test_only_super_admin_edits_home_hero(client, world):
    body = {"hero_title_fr": "Piraté"}
    assert (await client.put("/api/v1/settings/home-hero", json=body)).status_code == 401
    assert (await client.put("/api/v1/settings/home-hero", headers=auth(world.admin_a), json=body)).status_code == 403


async def test_home_hero_title_length_is_limited(client, world):
    r = await client.put("/api/v1/settings/home-hero", headers=auth(world.super_admin), json={"hero_title_fr": "x" * 201})
    assert r.status_code == 422
