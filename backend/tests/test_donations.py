"""Dons : paiement par carte (simulé), déclarations Mobile Money, validation par un admin."""

import uuid

from app.core.config import settings


def _reference() -> str:
    return "T" + uuid.uuid4().hex[:10].upper()


def _declaration(**overrides) -> dict:
    data = {
        "operator": "MVOLA",
        "sender_phone": "034 12 345 67",
        "transaction_reference": _reference(),
        "amount": 5000,
        "donor_email": f"{uuid.uuid4().hex[:8]}@example.com",
    }
    data.update(overrides)
    return data


async def test_card_donation_success_and_decline(client):
    ok = await client.post("/donations/card", json={"amount": 25, "donor_email": "a@example.com", "payment_token": "sim_tok_success"})
    assert ok.status_code == 201, ok.text
    assert ok.json()["status"] == "CONFIRMED"

    declined = await client.post("/donations/card", json={"amount": 25, "donor_email": "a@example.com", "payment_token": "sim_tok_declined"})
    assert declined.status_code == 402

    forged = await client.post("/donations/card", json={"amount": 25, "donor_email": "a@example.com", "payment_token": "n-importe-quoi"})
    assert forged.status_code == 402


async def test_card_simulation_disabled_in_production(client, monkeypatch):
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    response = await client.post("/donations/card", json={"amount": 25, "donor_email": "a@example.com", "payment_token": "sim_tok_success"})
    assert response.status_code == 400
    options = await client.get("/donations/payment-options")
    assert options.json()["card"]["enabled"] is False


async def test_mobile_money_declaration_is_pending_and_unique(client):
    data = _declaration()
    first = await client.post("/donations/mobile-money", json=data)
    assert first.status_code == 201, first.text
    assert first.json()["status"] == "PENDING"

    duplicate = await client.post("/donations/mobile-money", json={**data, "donor_email": "autre@example.com"})
    assert duplicate.status_code == 409


async def test_mobile_money_honeypot(client):
    response = await client.post("/donations/mobile-money", json=_declaration(website="http://spam.example"))
    assert response.status_code == 400


async def test_mobile_money_pending_cap_per_phone(client):
    phone = "034 98 765 43"
    for _ in range(3):
        assert (await client.post("/donations/mobile-money", json=_declaration(sender_phone=phone))).status_code == 201
    assert (await client.post("/donations/mobile-money", json=_declaration(sender_phone=phone))).status_code == 429


async def test_mobile_money_ip_rate_limit(client):
    statuses = [
        (await client.post("/donations/mobile-money", json=_declaration(sender_phone=f"0341{i:06d}"))).status_code
        for i in range(11)
    ]
    assert statuses[:10] == [201] * 10
    assert statuses[10] == 429


async def _pending_donation(client, branch_id: int) -> int:
    response = await client.post("/donations/mobile-money", json=_declaration(branch_id=branch_id))
    assert response.status_code == 201, response.text
    return response.json()["id"]


async def test_confirm_reject_and_isolation(client, tana_admin, paris_admin, branch_ids):
    donation_id = await _pending_donation(client, branch_ids["Antananarivo"])

    # Un admin d'une autre antenne ne peut rien faire
    assert (await client.post(f"/donations/{donation_id}/confirm", headers=paris_admin, json={})).status_code == 403

    confirmed = await client.post(f"/donations/{donation_id}/confirm", headers=tana_admin, json={"amount": 4500})
    assert confirmed.status_code == 200, confirmed.text
    assert confirmed.json()["status"] == "CONFIRMED"
    assert confirmed.json()["amount"] == 4500
    assert confirmed.json()["declared_amount"] == 5000

    other_id = await _pending_donation(client, branch_ids["Antananarivo"])
    rejected = await client.post(f"/donations/{other_id}/reject", headers=tana_admin, json={"reason": "Introuvable"})
    assert rejected.json()["status"] == "REJECTED"


async def test_confirmed_donation_cannot_be_erased_by_branch_admin(client, tana_admin, super_admin, branch_ids):
    donation_id = await _pending_donation(client, branch_ids["Antananarivo"])
    await client.post(f"/donations/{donation_id}/confirm", headers=tana_admin, json={})

    assert (await client.delete(f"/donations/{donation_id}", headers=tana_admin)).status_code == 400
    # Rouvrir un don confirmé (ce qui le rendrait supprimable) est réservé au Super Admin
    assert (await client.post(f"/donations/{donation_id}/reopen", headers=tana_admin)).status_code == 403
    assert (await client.post(f"/donations/{donation_id}/reopen", headers=super_admin)).status_code == 200


async def test_branch_admin_sees_only_own_donations(client, tana_admin, branch_ids):
    response = await client.get("/donations", headers=tana_admin, params={"page_size": 100})
    assert response.status_code == 200
    assert {d["branch_id"] for d in response.json()["items"]} <= {branch_ids["Antananarivo"]}
