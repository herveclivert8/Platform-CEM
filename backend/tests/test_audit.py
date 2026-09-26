"""Le journal d'audit est alimenté par les opérations sensibles."""

from tests.conftest import TANA_ADMIN


async def _latest(client, super_admin, **filters) -> list[dict]:
    response = await client.get("/super-admin/audit", headers=super_admin, params={"page_size": 100, **filters})
    assert response.status_code == 200
    return response.json()["items"]


async def test_failed_login_is_audited(client, super_admin):
    await client.post("/auth/login", json={"email": TANA_ADMIN[0], "password": "mauvais"})
    entries = await _latest(client, super_admin, action="login")
    failed = [e for e in entries if e["user_email"] == TANA_ADMIN[0] and e["success"] == 0]
    assert failed
    assert failed[0]["ip_address"] == "203.0.113.10"


async def test_post_lifecycle_is_audited(client, tana_admin, super_admin, branch_ids):
    created = await client.post(
        f"/branches/{branch_ids['Antananarivo']}/posts",
        headers=tana_admin,
        json={"title": "Audit me", "content": "<p>x</p>", "pillar": "SOCIAL", "status": "DRAFT", "images": []},
    )
    post_id = created.json()["id"]
    await client.put(f"/posts/{post_id}", headers=tana_admin, json={"status": "PUBLISHED"})
    await client.delete(f"/posts/{post_id}", headers=tana_admin)

    entries = [e for e in await _latest(client, super_admin, resource_type="post") if e["resource_id"] == post_id]
    assert {e["action"] for e in entries} == {"create", "update", "delete"}
    assert all(e["user_email"] == TANA_ADMIN[0] for e in entries)


async def test_audit_survives_admin_deletion(client, super_admin, branch_ids):
    created = await client.post(
        "/super-admin/admins",
        headers=super_admin,
        json={"email": "ephemere@test.cem", "first_name": "E", "last_name": "Phémère", "branch_id": branch_ids["Lyon"]},
    )
    admin = created.json()
    await client.post("/auth/login", json={"email": admin["email"], "password": admin["temporary_password"]})

    # Ses entrées d'audit ne bloquent pas la suppression du compte
    assert (await client.delete(f"/super-admin/admins/{admin['id']}", headers=super_admin)).status_code == 204
    entries = [e for e in await _latest(client, super_admin, resource_type="user") if e["user_email"] == admin["email"]]
    assert entries
