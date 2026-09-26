"""Un admin d'antenne n'agit que sur son antenne ; les actions globales sont réservées au super admin."""

from tests.conftest import auth

POST = {"title": "Titre", "content": "<p>Contenu</p>", "pillar": "EDUCATION", "status": "PUBLISHED"}


async def create_post(client, user, branch_id):
    return await client.post(f"/api/v1/branches/{branch_id}/posts", headers=auth(user), json=POST)


async def test_write_actions_require_authentication(client, world):
    r = await client.post(f"/api/v1/branches/{world.branch_a.id}/posts", json=POST)
    assert r.status_code == 401


async def test_branch_admin_posts_only_in_own_branch(client, world):
    assert (await create_post(client, world.admin_a, world.branch_a.id)).status_code == 201
    assert (await create_post(client, world.admin_a, world.branch_b.id)).status_code == 403


async def test_super_admin_posts_in_any_branch(client, world):
    assert (await create_post(client, world.super_admin, world.branch_a.id)).status_code == 201
    assert (await create_post(client, world.super_admin, world.branch_b.id)).status_code == 201


async def test_branch_admin_cannot_edit_or_delete_other_branch_post(client, world):
    post_id = (await create_post(client, world.admin_b, world.branch_b.id)).json()["id"]
    headers = auth(world.admin_a)
    assert (await client.put(f"/api/v1/posts/{post_id}", headers=headers, json={"title": "Piraté"})).status_code == 403
    assert (await client.delete(f"/api/v1/posts/{post_id}", headers=headers)).status_code == 403
    # Toujours là, inchangé
    r = await client.get(f"/api/v1/posts/{post_id}")
    assert r.status_code == 200 and r.json()["title"] == "Titre"


async def test_branch_admin_reads_only_own_submissions(client, world):
    await client.post(f"/api/v1/branches/{world.branch_b.id}/submissions", json={
        "applicant_name": "Porteur", "email": "porteur@test.org", "project_summary": "Projet",
    })
    headers = auth(world.admin_a)
    assert (await client.get(f"/api/v1/branches/{world.branch_a.id}/submissions", headers=headers)).status_code == 200
    assert (await client.get(f"/api/v1/branches/{world.branch_b.id}/submissions", headers=headers)).status_code == 403


async def test_branch_admin_edits_only_own_branch(client, world):
    headers = auth(world.admin_a)
    ok = await client.put(f"/api/v1/branches/{world.branch_a.id}", headers=headers, json={"description": "Notre antenne"})
    assert ok.status_code == 200
    other = await client.put(f"/api/v1/branches/{world.branch_b.id}", headers=headers, json={"description": "x"})
    assert other.status_code == 403


async def test_only_super_admin_changes_branch_status(client, world):
    body = {"status": "inactive"}
    r = await client.put(f"/api/v1/branches/{world.branch_a.id}", headers=auth(world.admin_a), json=body)
    assert r.status_code == 403
    r = await client.put(f"/api/v1/branches/{world.branch_a.id}", headers=auth(world.super_admin), json=body)
    assert r.status_code == 200 and r.json()["status"] == "inactive"


async def test_super_admin_only_endpoints(client, world):
    headers = auth(world.admin_a)
    assert (await client.get("/api/v1/super-admin/admins", headers=headers)).status_code == 403
    assert (await client.delete(f"/api/v1/branches/{world.branch_b.id}", headers=headers)).status_code == 403
    assert (await client.post("/api/v1/branches/admin", headers=headers, json={
        "name": "Nouvelle", "country": "X",
    })).status_code == 403
    assert (await client.get("/api/v1/super-admin/admins", headers=auth(world.super_admin))).status_code == 200


async def test_admin_branch_list_is_scoped(client, world):
    r = await client.get("/api/v1/branches/admin", headers=auth(world.admin_a))
    assert [b["id"] for b in r.json()["items"]] == [world.branch_a.id]
    r = await client.get("/api/v1/branches/admin", headers=auth(world.super_admin))
    assert r.json()["total"] == 2
