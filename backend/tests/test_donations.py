import pytest

from tests.conftest import auth

CARD = {"donor_email": "donateur@test.org", "payment_token": "sim_tok_success"}


def mobile_money(branch_id, reference="REF001", **overrides):
    return {
        "branch_id": branch_id, "operator": "MVOLA", "sender_phone": "034 12 345 67",
        "transaction_reference": reference, "amount": 20000, "donor_email": "donateur@test.org", **overrides,
    }


# ---- Carte ----

@pytest.mark.parametrize("currency, amount", [("MGA", 25000), ("EUR", 25), ("USD", 25)])
async def test_card_donation_is_confirmed_in_chosen_currency(client, world, currency, amount):
    r = await client.post("/api/v1/donations/card", json={
        **CARD, "branch_id": world.branch_a.id, "currency": currency, "amount": amount,
    })
    assert r.status_code == 201
    assert r.json()["currency"] == currency
    assert r.json()["status"] == "CONFIRMED"


async def test_card_donation_defaults_to_euro(client, world):
    r = await client.post("/api/v1/donations/card", json={**CARD, "amount": 10})
    assert r.status_code == 201 and r.json()["currency"] == "EUR"


@pytest.mark.parametrize("currency, amount", [("MGA", 100), ("MGA", 10000.5), ("EUR", 0.5), ("GBP", 25)])
async def test_card_donation_invalid_amounts(client, world, currency, amount):
    r = await client.post("/api/v1/donations/card", json={**CARD, "currency": currency, "amount": amount})
    assert r.status_code == 422


async def test_declined_card_records_nothing(client, world):
    r = await client.post("/api/v1/donations/card", json={**CARD, "amount": 10, "payment_token": "sim_tok_declined"})
    assert r.status_code == 402
    donations = await client.get("/api/v1/donations", headers=auth(world.super_admin))
    assert donations.json()["total"] == 0


# ---- Mobile Money ----

async def test_mobile_money_declaration_is_pending(client, world):
    r = await client.post("/api/v1/donations/mobile-money", json=mobile_money(world.branch_a.id))
    assert r.status_code == 201
    assert r.json()["status"] == "PENDING" and r.json()["currency"] == "MGA"


async def test_mobile_money_reference_declared_only_once(client, world):
    assert (await client.post("/api/v1/donations/mobile-money", json=mobile_money(world.branch_a.id))).status_code == 201
    again = await client.post("/api/v1/donations/mobile-money", json=mobile_money(world.branch_b.id))
    assert again.status_code == 409


async def test_mobile_money_unconfigured_operator_refused(client, world):
    r = await client.post("/api/v1/donations/mobile-money", json=mobile_money(world.branch_a.id, operator="AIRTEL_MONEY"))
    assert r.status_code == 400


async def test_no_donations_to_inactive_branch(client, world):
    await client.put(f"/api/v1/branches/{world.branch_a.id}", headers=auth(world.super_admin), json={"status": "inactive"})
    card = await client.post("/api/v1/donations/card", json={**CARD, "branch_id": world.branch_a.id, "amount": 10})
    assert card.status_code == 409
    mm = await client.post("/api/v1/donations/mobile-money", json=mobile_money(world.branch_a.id))
    assert mm.status_code == 409


# ---- Vérification par les admins ----

async def test_branch_admin_sees_only_own_donations(client, world):
    await client.post("/api/v1/donations/mobile-money", json=mobile_money(world.branch_a.id, "REF-A"))
    await client.post("/api/v1/donations/mobile-money", json=mobile_money(world.branch_b.id, "REF-B"))

    mine = await client.get("/api/v1/donations", headers=auth(world.admin_a))
    assert [d["transaction_reference"] for d in mine.json()["items"]] == ["REF-A"]
    everything = await client.get("/api/v1/donations", headers=auth(world.super_admin))
    assert everything.json()["total"] == 2


async def test_confirming_a_donation(client, world):
    donation_id = (await client.post("/api/v1/donations/mobile-money", json=mobile_money(world.branch_b.id))).json()["id"]

    other_admin = await client.post(f"/api/v1/donations/{donation_id}/confirm", headers=auth(world.admin_a), json={})
    assert other_admin.status_code == 403

    r = await client.post(f"/api/v1/donations/{donation_id}/confirm", headers=auth(world.admin_b), json={"amount": 19000})
    assert r.status_code == 200
    assert r.json()["status"] == "CONFIRMED" and r.json()["amount"] == 19000

    twice = await client.post(f"/api/v1/donations/{donation_id}/confirm", headers=auth(world.admin_b), json={})
    assert twice.status_code == 400


async def test_rejecting_a_donation_requires_access(client, world):
    donation_id = (await client.post("/api/v1/donations/mobile-money", json=mobile_money(world.branch_b.id))).json()["id"]
    body = {"reason": "Aucun paiement trouvé"}
    assert (await client.post(f"/api/v1/donations/{donation_id}/reject", headers=auth(world.admin_a), json=body)).status_code == 403
    r = await client.post(f"/api/v1/donations/{donation_id}/reject", headers=auth(world.super_admin), json=body)
    assert r.status_code == 200 and r.json()["status"] == "REJECTED"
