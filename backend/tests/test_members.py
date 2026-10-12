"""Inscription des membres : compte en attente, et aucun accès au back-office."""

import uuid

from tests.conftest import bearer


def _member_payload(branch_id: int, **overrides) -> dict:
    payload = {
        "first_name": "Rova",
        "last_name": "Rakoto",
        "email": f"membre-{uuid.uuid4().hex[:8]}@test.cem",
        "phone": "034 12 345 67",
        "password": "MotDePasse123!",
        "branch_id": branch_id,
    }
    payload.update(overrides)
    return payload


async def _register(client, branch_id: int) -> dict:
    response = await client.post("/auth/register", json=_member_payload(branch_id))
    assert response.status_code == 201, response.text
    return response.json()


async def test_register_creates_pending_member(client, branch_ids):
    payload = _member_payload(branch_ids["Antananarivo"], email="Nouveau.Membre@Test.cem")
    response = await client.post("/auth/register", json=payload)
    assert response.status_code == 201, response.text
    user = response.json()["user"]
    assert user["role"] == "MEMBER"
    assert user["membership_status"] == "PENDING"
    assert user["branch_name"] == "Antananarivo"
    assert user["email"] == "nouveau.membre@test.cem"

    # Même email (casse différente) : refusé
    again = await client.post("/auth/register", json={**payload, "email": "nouveau.membre@test.cem"})
    assert again.status_code == 409

    login = await client.post("/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert login.status_code == 200
    assert login.json()["user"]["role"] == "MEMBER"


async def test_register_requires_phone(client, branch_ids):
    payload = _member_payload(branch_ids["Antananarivo"])
    del payload["phone"]
    assert (await client.post("/auth/register", json=payload)).status_code == 422
    assert (await client.post("/auth/register", json={**payload, "phone": "   "})).status_code == 422


async def test_register_rejects_unknown_branch(client):
    response = await client.post("/auth/register", json=_member_payload(999999))
    assert response.status_code == 404


async def test_member_cannot_use_admin_routes(client, branch_ids):
    tokens = await _register(client, branch_ids["Antananarivo"])
    headers = bearer(tokens["access_token"])

    assert (await client.get("/auth/me", headers=headers)).status_code == 200
    for path in ("/posts/admin", "/projects/admin", "/donations", "/notifications", "/super-admin/admins"):
        response = await client.get(path, headers=headers)
        assert response.status_code == 403, path
    assert (await client.get("/notifications/stream", headers=headers)).status_code == 403


async def test_member_is_treated_as_visitor_on_public_routes(client, branch_ids):
    tokens = await _register(client, branch_ids["Antananarivo"])
    headers = bearer(tokens["access_token"])

    # Les antennes inactives restent réservées au Super Admin
    response = await client.get("/branches", params={"include_inactive": True, "page_size": 100}, headers=headers)
    assert response.status_code == 200
    assert all(b["status"] == "active" for b in response.json()["items"])


async def test_admin_list_excludes_members(client, super_admin, branch_ids):
    tokens = await _register(client, branch_ids["Antananarivo"])
    response = await client.get("/super-admin/admins", headers=super_admin, params={"page_size": 100})
    assert response.status_code == 200
    emails = {a["email"] for a in response.json()["items"]}
    assert tokens["user"]["email"] not in emails
