"""Textes de « Qui sommes-nous » modifiables par le Super Admin."""


async def test_about_page_content(client, super_admin, tana_admin):
    assert (await client.put("/settings/about-page", headers=tana_admin, json={"content": {}})).status_code == 403

    unknown = await client.put("/settings/about-page", headers=super_admin, json={"content": {"about.inconnu": "x"}})
    assert unknown.status_code == 422

    saved = await client.put(
        "/settings/about-page",
        headers=super_admin,
        json={"content": {"about.intro": "  Notre nouvelle présentation.  ", "membership_types.ACTIVE.text": "   "}},
    )
    assert saved.status_code == 200, saved.text
    # Texte nettoyé ; un texte vide revient au contenu par défaut (clé absente)
    assert saved.json()["content"] == {"about.intro": "Notre nouvelle présentation."}

    public = await client.get("/settings/about-page")
    assert public.json()["content"] == {"about.intro": "Notre nouvelle présentation."}
    # Sans traduction prête, l'anglais affiche le français
    assert (await client.get("/settings/about-page", params={"lang": "en"})).json()["content"]["about.intro"] == "Notre nouvelle présentation."

    reset = await client.put("/settings/about-page", headers=super_admin, json={"content": {}})
    assert reset.json()["content"] == {}
