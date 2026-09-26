"""Couverture de la page d'accueil, modifiable par le Super Admin."""

import pytest

EMPTY = {k: None for k in (
    "hero_image_url", "hero_badge_fr", "hero_badge_en", "hero_title_fr", "hero_title_en",
    "hero_subtitle_fr", "hero_subtitle_en",
)}


@pytest.fixture
async def reset_hero(client, super_admin):
    yield
    await client.put("/settings/home-hero", headers=super_admin, json=EMPTY)


async def test_super_admin_customizes_home_hero(client, super_admin, reset_hero):
    r = await client.put("/settings/home-hero", headers=super_admin, json={
        "hero_image_url": "/uploads/couverture.jpg",
        "hero_title_fr": "  Ensemble pour Madagascar  ",
        "hero_title_en": "Together for Madagascar",
    })
    assert r.status_code == 200, r.text

    public = (await client.get("/settings/home-hero")).json()
    assert public["hero_image_url"] == "/uploads/couverture.jpg"
    assert public["hero_title_fr"] == "Ensemble pour Madagascar"  # espaces retirés
    assert public["hero_subtitle_fr"] is None  # non envoyé : texte par défaut du site


async def test_emptied_field_goes_back_to_default(client, super_admin, reset_hero):
    await client.put("/settings/home-hero", headers=super_admin, json={"hero_title_fr": "Titre"})
    await client.put("/settings/home-hero", headers=super_admin, json={"hero_title_fr": "  "})
    assert (await client.get("/settings/home-hero")).json()["hero_title_fr"] is None


async def test_only_super_admin_edits_home_hero(client, tana_admin):
    body = {"hero_title_fr": "Piraté"}
    assert (await client.put("/settings/home-hero", json=body)).status_code == 401
    assert (await client.put("/settings/home-hero", headers=tana_admin, json=body)).status_code == 403


async def test_home_hero_title_length_is_limited(client, super_admin):
    r = await client.put("/settings/home-hero", headers=super_admin, json={"hero_title_fr": "x" * 201})
    assert r.status_code == 422
