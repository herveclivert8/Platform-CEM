"""Badges à code QR : jeton par compte, informations lues en direct au scan."""

import uuid
from datetime import datetime, timedelta, timezone

from sqlalchemy import update

from app.db.session import AsyncSessionLocal
from app.models import User
from tests.conftest import bearer
from tests.test_members import _register
from tests.test_membership import _active_member, _set_paid_until


async def _my_token(client, headers) -> str:
    response = await client.get("/badges/me", headers=headers)
    assert response.status_code == 200, response.text
    return response.json()["token"]


async def test_member_badge_shows_live_information(client, branch_ids, tana_admin):
    tokens, headers = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    token = await _my_token(client, headers)

    scan = (await client.get(f"/badges/verify/{token}")).json()
    assert scan == {
        "valid": True,
        "role": "MEMBER",
        "first_name": "Rova",
        "last_name": "Rakoto",
        "email": tokens["user"]["email"],
        "title": "CEM Antananarivo",
    }

    # Le profil change : le même code QR affiche les nouvelles informations
    async with AsyncSessionLocal() as db:
        await db.execute(update(User).where(User.id == tokens["user"]["id"]).values(first_name="Hery"))
        await db.commit()
    assert (await client.get(f"/badges/verify/{token}")).json()["first_name"] == "Hery"
    assert await _my_token(client, headers) == token


async def test_pending_member_has_no_badge(client, branch_ids):
    tokens = await _register(client, branch_ids["Antananarivo"])
    assert (await client.get("/badges/me", headers=bearer(tokens["access_token"]))).status_code == 404


async def test_overdue_member_badge_is_invalid_without_details(client, branch_ids, tana_admin):
    tokens, headers = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    token = await _my_token(client, headers)

    await _set_paid_until(tokens["user"]["id"], datetime.now(timezone.utc).date() - timedelta(days=1))
    assert (await client.get(f"/badges/verify/{token}")).json() == {
        "valid": False, "role": None, "first_name": None, "last_name": None, "email": None, "title": None,
    }
    assert (await client.get("/badges/me", headers=headers)).status_code == 404


async def test_admin_badges(client, super_admin, tana_admin):
    tana = (await client.get(f"/badges/verify/{await _my_token(client, tana_admin)}")).json()
    assert (tana["valid"], tana["role"], tana["title"], tana["email"]) == (True, "BRANCH_ADMIN", "ADMIN Antananarivo", None)

    sup = (await client.get(f"/badges/verify/{await _my_token(client, super_admin)}")).json()
    assert (sup["valid"], sup["role"], sup["title"], sup["email"]) == (True, "SUPER_ADMIN", "Superadmin", None)


async def test_new_admin_gets_a_badge(client, super_admin, branch_ids):
    response = await client.post(
        "/super-admin/admins",
        headers=super_admin,
        json={
            "email": f"admin-{uuid.uuid4().hex[:8]}@test.cem",
            "first_name": "Nirina",
            "last_name": "Rabe",
            "branch_id": branch_ids["Fianarantsoa"],
        },
    )
    assert response.status_code == 201, response.text
    scan = (await client.get(f"/badges/verify/{response.json()['badge_token']}")).json()
    assert (scan["first_name"], scan["title"]) == ("Nirina", "ADMIN Fianarantsoa")


async def test_unknown_badge(client):
    assert (await client.get("/badges/verify/inconnu")).status_code == 404
