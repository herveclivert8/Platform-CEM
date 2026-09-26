"""Statut des antennes (actif / inactif / en attente) et suppression."""

from tests.conftest import auth

SUBMISSION = {"applicant_name": "Porteur", "email": "porteur@test.org", "project_summary": "Projet"}


async def set_status(client, world, branch_id, status):
    r = await client.put(f"/api/v1/branches/{branch_id}", headers=auth(world.super_admin), json={"status": status})
    assert r.status_code == 200


async def test_public_directory_lists_only_active_branches(client, world):
    await set_status(client, world, world.branch_b.id, "inactive")
    r = await client.get("/api/v1/branches")
    assert [b["id"] for b in r.json()["items"]] == [world.branch_a.id]


async def test_pending_branch_is_hidden_from_public(client, world):
    await set_status(client, world, world.branch_a.id, "pending")
    assert (await client.get(f"/api/v1/branches/{world.branch_a.id}")).status_code == 404
    assert (await client.get(f"/api/v1/branches/{world.branch_a.id}/posts")).status_code == 404
    # ... mais visible de ses admins
    r = await client.get(f"/api/v1/branches/{world.branch_a.id}", headers=auth(world.admin_a))
    assert r.status_code == 200


async def test_inactive_branch_page_stays_readable_but_closed_to_submissions(client, world):
    await set_status(client, world, world.branch_a.id, "inactive")
    page = await client.get(f"/api/v1/branches/{world.branch_a.id}")
    assert page.status_code == 200 and page.json()["status"] == "inactive"

    public = await client.post(f"/api/v1/branches/{world.branch_a.id}/submissions", json=SUBMISSION)
    assert public.status_code == 409
    # Un admin peut encore enregistrer un dossier reçu hors du site
    by_admin = await client.post(
        f"/api/v1/branches/{world.branch_a.id}/submissions", headers=auth(world.admin_a), json=SUBMISSION
    )
    assert by_admin.status_code == 201


async def test_branch_with_admins_cannot_be_deleted(client, world):
    r = await client.delete(f"/api/v1/branches/{world.branch_a.id}", headers=auth(world.super_admin))
    assert r.status_code == 409


async def test_branch_without_admins_can_be_deleted(client, world):
    created = await client.post("/api/v1/branches/admin", headers=auth(world.super_admin), json={
        "name": "Temporaire", "country": "Madagascar",
    })
    branch_id = created.json()["id"]
    assert (await client.delete(f"/api/v1/branches/{branch_id}", headers=auth(world.super_admin))).status_code == 204
