"""Dons par carte : devise choisie par le donateur (ariary, euro, dollar US)."""

import pytest

CARD = {"donor_email": "donateur@test.cem", "payment_token": "sim_tok_success"}


@pytest.mark.parametrize("currency, amount", [("MGA", 25000), ("EUR", 25), ("USD", 25)])
async def test_card_donation_in_chosen_currency(client, currency, amount):
    r = await client.post("/donations/card", json={**CARD, "currency": currency, "amount": amount})
    assert r.status_code == 201, r.text
    assert r.json()["currency"] == currency and r.json()["status"] == "CONFIRMED"


async def test_card_donation_defaults_to_euro(client):
    r = await client.post("/donations/card", json={**CARD, "amount": 10})
    assert r.status_code == 201 and r.json()["currency"] == "EUR"


@pytest.mark.parametrize("currency, amount", [("MGA", 100), ("MGA", 10000.5), ("EUR", 0.5), ("GBP", 25)])
async def test_card_donation_invalid_amount_or_currency(client, currency, amount):
    r = await client.post("/donations/card", json={**CARD, "currency": currency, "amount": amount})
    assert r.status_code == 422
