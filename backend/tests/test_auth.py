"""Authentification : connexion, révocation des sessions, mot de passe temporaire, force brute."""

import uuid

from tests.conftest import PARIS_ADMIN, TANA_ADMIN, bearer, login


async def test_login_success_and_failure(client):
    data = await login(client, *TANA_ADMIN)
    assert data["user"]["role"] == "BRANCH_ADMIN"
    assert data["user"]["must_change_password"] is False

    response = await client.post("/auth/login", json={"email": TANA_ADMIN[0], "password": "mauvais"})
    assert response.status_code == 401


async def test_logout_revokes_every_session(client):
    first = await login(client, *PARIS_ADMIN)
    second = await login(client, *PARIS_ADMIN)

    assert (await client.post("/auth/logout", headers=bearer(second["access_token"]))).status_code == 200

    assert (await client.get("/auth/me", headers=bearer(first["access_token"]))).status_code == 401
    refresh = await client.post("/auth/refresh", json={"refresh_token": first["refresh_token"]})
    assert refresh.status_code == 401


async def test_refresh_rejects_access_token(client):
    tokens = await login(client, *TANA_ADMIN)
    response = await client.post("/auth/refresh", json={"refresh_token": tokens["access_token"]})
    assert response.status_code == 401


async def _create_admin(client, super_admin, branch_id: int) -> tuple[str, str]:
    email = f"admin-{uuid.uuid4().hex[:8]}@test.cem"
    response = await client.post(
        "/super-admin/admins",
        headers=super_admin,
        json={"email": email, "first_name": "Test", "last_name": "Admin", "branch_id": branch_id},
    )
    assert response.status_code == 201, response.text
    return email, response.json()["temporary_password"]


async def test_temporary_password_must_be_changed(client, super_admin, branch_ids):
    email, temporary = await _create_admin(client, super_admin, branch_ids["Lyon"])

    tokens = await login(client, email, temporary)
    assert tokens["user"]["must_change_password"] is True
    headers = bearer(tokens["access_token"])

    # Tout est bloqué, sauf /auth/me et le changement de mot de passe
    blocked = await client.get("/posts/admin", headers=headers)
    assert blocked.status_code == 403
    assert blocked.json()["detail"] == "PASSWORD_CHANGE_REQUIRED"
    assert (await client.get("/auth/me", headers=headers)).status_code == 200

    changed = await client.post(
        "/auth/password/change",
        headers=headers,
        json={"current_password": temporary, "new_password": "MonNouveauMdp1!", "confirm_password": "MonNouveauMdp1!"},
    )
    assert changed.status_code == 200, changed.text
    assert changed.json()["user"]["must_change_password"] is False

    # L'ancien jeton est révoqué, le nouveau fonctionne
    assert (await client.get("/auth/me", headers=headers)).status_code == 401
    new_headers = bearer(changed.json()["access_token"])
    assert (await client.get("/posts/admin", headers=new_headers)).status_code == 200


async def test_change_password_rejects_same_password(client, super_admin, branch_ids):
    email, temporary = await _create_admin(client, super_admin, branch_ids["Lyon"])
    headers = bearer((await login(client, email, temporary))["access_token"])
    response = await client.post(
        "/auth/password/change",
        headers=headers,
        json={"current_password": temporary, "new_password": temporary, "confirm_password": temporary},
    )
    assert response.status_code == 400


async def test_deleted_admin_loses_access(client, super_admin, branch_ids):
    email, temporary = await _create_admin(client, super_admin, branch_ids["Lyon"])
    tokens = await login(client, email, temporary)
    admin_id = tokens["user"]["id"]

    assert (await client.delete(f"/super-admin/admins/{admin_id}", headers=super_admin)).status_code == 204
    assert (await client.get("/auth/me", headers=bearer(tokens["access_token"]))).status_code == 401


async def test_login_is_rate_limited_and_forwarded_header_is_ignored(client):
    payload = {"email": "inconnu@test.cem", "password": "x"}
    for i in range(10):
        response = await client.post("/auth/login", json=payload, headers={"X-Forwarded-For": f"10.0.0.{i}"})
        assert response.status_code == 401
    # Changer X-Forwarded-For ne contourne pas la limite
    response = await client.post("/auth/login", json=payload, headers={"X-Forwarded-For": "10.0.0.99"})
    assert response.status_code == 429
    assert "retry-after" in response.headers


async def test_forgot_password_is_generic(client):
    known = await client.post("/auth/password/forgot", json={"email": TANA_ADMIN[0]})
    unknown = await client.post("/auth/password/forgot", json={"email": "personne@test.cem"})
    assert known.status_code == unknown.status_code == 200
    assert known.json() == unknown.json()
