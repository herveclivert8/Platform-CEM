"""Listes admin paginées et filtrées côté serveur, suivi des dossiers, tableau de bord."""

import uuid

POST = {"content": "<p>x</p>", "pillar": "SOLIDARITY", "status": "DRAFT", "images": []}


async def test_posts_admin_scope_filters_and_search(client, tana_admin, super_admin, branch_ids):
    tag = uuid.uuid4().hex[:8]
    tana = branch_ids["Antananarivo"]
    for i in range(3):
        response = await client.post(f"/branches/{tana}/posts", headers=tana_admin, json={**POST, "title": f"Match {tag} n°{i}"})
        assert response.status_code == 201

    found = await client.get("/posts/admin", headers=tana_admin, params={"q": tag, "status": "DRAFT", "pillar": "SOLIDARITY"})
    assert found.json()["total"] == 3

    paged = await client.get("/posts/admin", headers=tana_admin, params={"q": tag, "page_size": 2, "page": 2})
    assert paged.json()["total_pages"] == 2 and len(paged.json()["items"]) == 1

    # Un admin d'antenne ne voit que la sienne, même sans filtre
    mine = await client.get("/posts/admin", headers=tana_admin, params={"page_size": 100})
    assert {p["branch_id"] for p in mine.json()["items"]} == {tana}
    assert (await client.get("/posts/admin", headers=tana_admin, params={"branch_id": branch_ids["Paris"]})).status_code == 403

    # Le Super Admin voit tout, ou une antenne
    everything = await client.get("/posts/admin", headers=super_admin, params={"q": tag})
    assert everything.json()["total"] == 3
    other = await client.get("/posts/admin", headers=super_admin, params={"q": tag, "branch_id": branch_ids["Paris"]})
    assert other.json()["total"] == 0


async def test_search_escapes_wildcards(client, tana_admin):
    response = await client.get("/posts/admin", headers=tana_admin, params={"q": "%"})
    assert response.status_code == 200
    assert response.json()["total"] == 0


async def test_dashboard_summary_counts_in_database(client, tana_admin, super_admin, branch_ids):
    tana = branch_ids["Antananarivo"]
    before = (await client.get("/dashboard/summary", headers=tana_admin)).json()

    card = await client.post(
        "/donations/card",
        json={"amount": 40, "donor_email": "d@example.com", "payment_token": "sim_tok_success", "branch_id": tana},
    )
    assert card.status_code == 201

    after = (await client.get("/dashboard/summary", headers=tana_admin)).json()
    eur_before = next((t["amount"] for t in before["donations_confirmed_totals"] if t["currency"] == "EUR"), 0)
    eur_after = next(t["amount"] for t in after["donations_confirmed_totals"] if t["currency"] == "EUR")
    assert eur_after == eur_before + 40
    assert after["donations_confirmed"] == before["donations_confirmed"] + 1

    assert (await client.get("/dashboard/summary", headers=tana_admin, params={"branch_id": branch_ids["Paris"]})).status_code == 403
    assert (await client.get("/dashboard/summary", headers=super_admin)).status_code == 200


async def test_donations_filtered_by_status_and_search(client, super_admin):
    reference = "SRCH" + uuid.uuid4().hex[:6].upper()
    await client.post(
        "/donations/mobile-money",
        json={"operator": "MVOLA", "sender_phone": "0345550000", "transaction_reference": reference, "amount": 1000, "donor_email": "s@example.com"},
    )
    found = await client.get("/donations", headers=super_admin, params={"q": reference.lower(), "status": "PENDING"})
    assert [d["transaction_reference"] for d in found.json()["items"]] == [reference]
    none = await client.get("/donations", headers=super_admin, params={"q": reference, "status": "CONFIRMED"})
    assert none.json()["total"] == 0
