"""Coordonnées laissées par les bienfaiteurs et parrains/marraines : confidentielles, Super Admin seul."""

import uuid

CONTACT = {"kind": "BENEFACTOR", "full_name": "Rakoto Bienfaiteur", "phone": "+261 34 00 000 00", "message": "Appelez-moi"}


async def test_public_contact_is_super_admin_only(client, super_admin, tana_admin):
    tag = uuid.uuid4().hex[:8]
    created = await client.post("/supporter-contacts", json={**CONTACT, "email": f"{tag}@example.com"})
    assert created.status_code == 202, created.text
    # La réponse publique ne renvoie rien de la fiche
    assert set(created.json()) == {"message"}

    assert (await client.get("/supporter-contacts")).status_code == 401
    assert (await client.get("/supporter-contacts", headers=tana_admin)).status_code == 403

    listed = await client.get("/supporter-contacts", headers=super_admin, params={"q": tag, "kind": "BENEFACTOR"})
    assert listed.status_code == 200
    [contact] = listed.json()["items"]
    assert contact["full_name"] == "Rakoto Bienfaiteur" and contact["status"] == "NEW"

    updated = await client.patch(f"/supporter-contacts/{contact['id']}", headers=super_admin, json={"status": "CONTACTED"})
    assert updated.json()["status"] == "CONTACTED" and updated.json()["contacted_at"]
    assert (await client.patch(f"/supporter-contacts/{contact['id']}", headers=tana_admin, json={"status": "NEW"})).status_code == 403

    assert (await client.delete(f"/supporter-contacts/{contact['id']}", headers=super_admin)).status_code == 204
    gone = await client.get("/supporter-contacts", headers=super_admin, params={"q": tag})
    assert gone.json()["total"] == 0


async def test_honeypot_and_validation(client, super_admin):
    tag = uuid.uuid4().hex[:8]
    trapped = await client.post("/supporter-contacts", json={**CONTACT, "email": f"{tag}@example.com", "website": "spam"})
    assert trapped.status_code == 202
    assert (await client.get("/supporter-contacts", headers=super_admin, params={"q": tag})).json()["total"] == 0

    assert (await client.post("/supporter-contacts", json={**CONTACT, "kind": "ACTIVE", "email": "a@example.com"})).status_code == 422


async def test_accepted_supporter_sees_ongoing_projects_but_cannot_take_part(client, super_admin, tana_admin, branch_ids):
    from tests.conftest import bearer, login

    tag = uuid.uuid4().hex[:8]
    email = f"parrain-{tag}@example.com"
    await client.post("/supporter-contacts", json={**CONTACT, "kind": "SPONSOR", "email": email})
    [contact] = (await client.get("/supporter-contacts", headers=super_admin, params={"q": tag})).json()["items"]

    names = {"first_name": "Rakoto", "last_name": "Parrain"}
    assert (await client.post(f"/supporter-contacts/{contact['id']}/accept", headers=tana_admin, json=names)).status_code == 403
    accepted = await client.post(f"/supporter-contacts/{contact['id']}/accept", headers=super_admin, json=names)
    assert accepted.status_code == 201, accepted.text
    assert accepted.json()["contact"]["status"] == "ACCEPTED" and accepted.json()["contact"]["has_account_access"]
    assert (await client.post(f"/supporter-contacts/{contact['id']}/accept", headers=super_admin, json=names)).status_code == 409

    # Première connexion : mot de passe temporaire à remplacer
    temporary = accepted.json()["temporary_password"]
    tokens = await login(client, email, temporary)
    changed = await client.post(
        "/auth/password/change", headers=bearer(tokens["access_token"]),
        json={"current_password": temporary, "new_password": "Parrain123!", "confirm_password": "Parrain123!"},
    )
    me = changed.json()["user"]
    assert (me["membership_type"], me["member_access"], me["can_participate"]) == ("SPONSOR", True, False)
    headers = bearer(changed.json()["access_token"])

    # Voit les projets en cours…
    ongoing = {
        "title": f"En cours {tag}", "summary": "S", "description": "<p>D</p>", "pillar": "SOCIAL",
        "phase": "ONGOING", "beneficiaries": "B", "branch_id": branch_ids["Antananarivo"],
    }
    project = (await client.post("/projects", headers=tana_admin, json=ongoing)).json()
    assert (await client.get(f"/projects/{project['id']}", headers=headers)).status_code == 200
    listed = (await client.get("/projects", headers=headers, params={"phase": "ONGOING", "page_size": 100})).json()
    assert project["id"] in [p["id"] for p in listed["items"]]

    # … sans proposer de projet, discuter, ni payer de cotisation
    proposal = {"title": "Non", "summary": "S", "description": "D", "pillar": "SOCIAL", "beneficiaries": "B"}
    assert (await client.post("/members/me/projects", headers=headers, json=proposal)).status_code == 403
    assert (await client.post(f"/projects/{project['id']}/comments", headers=headers, json={"body": "Bravo"})).status_code == 403
    assert (await client.get(f"/projects/{project['id']}/comments", headers=headers)).status_code == 403
    assert (await client.post("/members/me/payments/cash", headers=headers, json={"kind": "MONTHLY"})).status_code in (400, 422)

    # Pas dans la liste des membres actifs
    members = (await client.get("/members/admin", headers=super_admin, params={"q": tag})).json()
    assert members["total"] == 0

    # Accès retiré : sessions fermées, plus de projets en cours
    removed = await client.post(f"/supporter-contacts/{contact['id']}/access", headers=super_admin, json={"active": False})
    assert removed.json()["has_account_access"] is False
    assert (await client.get("/auth/me", headers=headers)).status_code == 401
    headers = bearer((await login(client, email, "Parrain123!"))["access_token"])
    assert (await client.get(f"/projects/{project['id']}", headers=headers)).status_code == 403

    # Fiche supprimée : compte anonymisé, plus de connexion possible
    assert (await client.delete(f"/supporter-contacts/{contact['id']}", headers=super_admin)).status_code == 204
    assert (await client.post("/auth/login", json={"email": email, "password": "Parrain123!"})).status_code == 401
