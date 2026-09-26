"""Espace super admin : comptes, statistiques, et format des réponses d'erreur."""

from datetime import datetime

from tests.conftest import auth


async def test_admin_accounts_list(client, world):
    r = await client.get("/api/v1/super-admin/admins", headers=auth(world.super_admin))
    assert r.status_code == 200
    body = r.json()
    assert body["total"] == 3
    admin_a = next(a for a in body["items"] if a["email"] == "admin.a@test.org")
    assert admin_a["role"] == "BRANCH_ADMIN" and admin_a["branch_name"] == "Antenne A"


async def test_create_admin_returns_temporary_password(client, world):
    r = await client.post("/api/v1/super-admin/admins", headers=auth(world.super_admin), json={
        "email": "nouvel.admin@test.org", "first_name": "Nouvel", "last_name": "Admin", "branch_id": world.branch_b.id,
    })
    assert r.status_code == 201
    assert r.json()["temporary_password"] and r.json()["welcome_email_sent"] is False  # pas de SMTP en test

    again = await client.post("/api/v1/super-admin/admins", headers=auth(world.super_admin), json={
        "email": "nouvel.admin@test.org", "first_name": "X", "last_name": "Y", "branch_id": world.branch_b.id,
    })
    assert again.status_code == 400
    assert again.json()["detail"] == "Un compte existe déjà avec cet email"


async def test_super_admin_cannot_delete_own_account(client, world):
    r = await client.delete(f"/api/v1/super-admin/admins/{world.super_admin.id}", headers=auth(world.super_admin))
    assert r.status_code == 400


async def test_global_statistics(client, world):
    r = await client.get("/api/v1/super-admin/statistics", headers=auth(world.super_admin))
    assert r.status_code == 200
    body = r.json()
    assert body["total_branches"] == 2 and body["total_admins"] == 2
    datetime.fromisoformat(body["generated_at"])  # une vraie date, plus "now"


async def test_unread_notification_count(client, world):
    r = await client.get("/api/v1/notifications/unread-count", headers=auth(world.admin_a))
    assert r.status_code == 200 and r.json() == {"unread_count": 0}


async def test_error_messages_are_in_french(client, world):
    missing = await client.get("/api/v1/branches/9999")
    assert missing.json()["detail"] == "Antenne introuvable"

    other_branch = await client.get(f"/api/v1/branches/{world.branch_b.id}/submissions", headers=auth(world.admin_a))
    assert other_branch.json()["detail"] == "Accès refusé : vous ne pouvez agir que sur votre antenne"

    not_super = await client.get("/api/v1/super-admin/statistics", headers=auth(world.admin_a))
    assert not_super.json()["detail"] == "Accès réservé au super admin"

    no_token = await client.get("/api/v1/auth/me")
    assert no_token.json()["detail"] == "Non authentifié"
