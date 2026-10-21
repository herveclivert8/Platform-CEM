"""Logo du site : changé par le Super Admin depuis la page d'accueil, lu publiquement."""


async def test_super_admin_changes_and_resets_logo(client, super_admin, tana_admin):
    logos = {"logo_url": "/uploads/logo.png", "logo_mark_url": "/uploads/embleme.png"}
    assert (await client.put("/settings/home-page", headers=tana_admin, json=logos)).status_code == 403

    saved = await client.put("/settings/home-page", headers=super_admin, json=logos)
    assert saved.status_code == 200, saved.text
    public = (await client.get("/settings/home-page")).json()
    assert (public["logo_url"], public["logo_mark_url"]) == ("/uploads/logo.png", "/uploads/embleme.png")

    # Champ vidé : retour au logo livré avec le site, sans toucher au reste
    await client.put("/settings/home-page", headers=super_admin, json={"logo_url": "", "logo_mark_url": None})
    public = (await client.get("/settings/home-page")).json()
    assert (public["logo_url"], public["logo_mark_url"]) == (None, None)
