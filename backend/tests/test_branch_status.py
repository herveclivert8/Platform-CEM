"""Statut des antennes : "en attente" invisible pour le public, "inactive" consultable mais fermée."""

import random
import uuid
from contextlib import asynccontextmanager

SUBMISSION = {"applicant_name": "Porteur", "email": "porteur@test.cem", "project_summary": "Un projet"}


@asynccontextmanager
async def branch_status(client, super_admin, branch_id: int, status: str):
    """Change le statut le temps du test, puis remet l'antenne active (la base est partagée entre les tests)."""
    r = await client.put(f"/branches/{branch_id}", headers=super_admin, json={"status": status})
    assert r.status_code == 200, r.text
    try:
        yield
    finally:
        await client.put(f"/branches/{branch_id}", headers=super_admin, json={"status": "active"})


def _mobile_money(branch_id: int) -> dict:
    return {
        "branch_id": branch_id, "operator": "MVOLA", "sender_phone": f"034{random.randint(1000000, 9999999)}",
        "transaction_reference": "T" + uuid.uuid4().hex[:10].upper(), "amount": 5000,
        "donor_email": f"{uuid.uuid4().hex[:8]}@example.com",
    }


async def test_pending_branch_is_hidden_from_public(client, super_admin, tana_admin, branch_ids):
    tana = branch_ids["Antananarivo"]
    async with branch_status(client, super_admin, tana, "pending"):
        assert (await client.get(f"/branches/{tana}")).status_code == 404
        assert (await client.get(f"/branches/{tana}/posts")).status_code == 404
        public = await client.get("/branches", params={"page_size": 100})
        assert tana not in [b["id"] for b in public.json()["items"]]
        # ... mais ses admins et le Super Admin la voient
        assert (await client.get(f"/branches/{tana}", headers=tana_admin)).status_code == 200
        assert (await client.get(f"/branches/{tana}", headers=super_admin)).status_code == 200


async def test_inactive_branch_is_readable_but_closed(client, super_admin, tana_admin, branch_ids):
    tana = branch_ids["Antananarivo"]
    async with branch_status(client, super_admin, tana, "inactive"):
        page = await client.get(f"/branches/{tana}")
        assert page.status_code == 200 and page.json()["status"] == "inactive"
        assert (await client.get(f"/branches/{tana}/posts")).status_code == 200

        assert (await client.post(f"/branches/{tana}/submissions", json=SUBMISSION)).status_code == 409
        # Un admin peut toujours saisir un dossier reçu hors du site
        by_admin = await client.post(f"/branches/{tana}/submissions", headers=tana_admin, json=SUBMISSION)
        assert by_admin.status_code == 201, by_admin.text

        card = await client.post("/donations/card", json={
            "branch_id": tana, "currency": "EUR", "amount": 10,
            "donor_email": "donateur@test.cem", "payment_token": "sim_tok_success",
        })
        assert card.status_code == 409
        assert (await client.post("/donations/mobile-money", json=_mobile_money(tana))).status_code == 409


async def test_super_admin_lists_every_status(client, super_admin, branch_ids):
    tana = branch_ids["Antananarivo"]
    async with branch_status(client, super_admin, tana, "inactive"):
        everything = await client.get("/branches", headers=super_admin, params={"include_inactive": True, "page_size": 100})
        assert tana in [b["id"] for b in everything.json()["items"]]
