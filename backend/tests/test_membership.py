"""Adhésion : frais d'inscription, validation, cotisation mensuelle, projets des membres et discussions."""

import uuid
from datetime import date, datetime, timedelta, timezone

from sqlalchemy import update

from tests.conftest import bearer
from app.db.session import AsyncSessionLocal
from app.models import User
from app.services.membership import next_due_after
from tests.test_members import _register


async def _pay_registration_by_card(client, headers) -> dict:
    response = await client.post(
        "/members/me/payments/card",
        headers=headers,
        json={"kind": "REGISTRATION", "currency": "EUR", "payment_token": "sim_tok_success"},
    )
    assert response.status_code == 201, response.text
    return response.json()


async def _active_member(client, branch_id: int, admin_headers: dict) -> tuple[dict, dict]:
    """Membre inscrit, frais payés, adhésion validée et cotisation du mois payée par carte."""
    tokens = await _register(client, branch_id)
    headers = bearer(tokens["access_token"])
    await _pay_registration_by_card(client, headers)
    response = await client.post(f"/members/admin/{tokens['user']['id']}/approve", headers=admin_headers)
    assert response.status_code == 204, response.text
    response = await client.post(
        "/members/me/payments/card",
        headers=headers,
        json={"kind": "MONTHLY", "currency": "MGA", "payment_token": "sim_tok_success"},
    )
    assert response.status_code == 201, response.text
    assert response.json()["has_access"] is True
    return tokens, headers


async def test_fees_are_public(client):
    response = await client.get("/members/fees")
    assert response.status_code == 200
    data = response.json()
    assert set(data["registration"]) == {"MGA", "EUR", "USD"}
    assert set(data["monthly"]) == {"MGA", "EUR", "USD"}


async def test_registration_payment_then_approval(client, branch_ids, tana_admin, paris_admin):
    tokens = await _register(client, branch_ids["Antananarivo"])
    headers = bearer(tokens["access_token"])
    member_id = tokens["user"]["id"]

    # Validation impossible tant que les frais ne sont pas reçus
    assert (await client.post(f"/members/admin/{member_id}/approve", headers=tana_admin)).status_code == 400
    # Cotisation impossible avant la validation
    early = await client.post("/members/me/payments/cash", headers=headers, json={"kind": "MONTHLY", "currency": "MGA"})
    assert early.status_code == 400

    summary = await _pay_registration_by_card(client, headers)
    assert summary["registration_paid"] is True
    assert summary["payments"][0]["amount"] == 10
    assert summary["payments"][0]["currency"] == "EUR"
    again = await client.post("/members/me/payments/cash", headers=headers, json={"kind": "REGISTRATION", "currency": "MGA"})
    assert again.status_code == 409

    # Seul l'admin de l'antenne du membre (ou le Super Admin) valide
    assert (await client.post(f"/members/admin/{member_id}/approve", headers=paris_admin)).status_code == 403
    assert (await client.post(f"/members/admin/{member_id}/approve", headers=tana_admin)).status_code == 204

    me = (await client.get("/members/me", headers=headers)).json()
    assert me["membership_status"] == "ACTIVE"
    # Les frais d'inscription valent cotisation jusqu'à la prochaine échéance (le 30)
    assert me["has_access"] is True
    today = datetime.now(timezone.utc).date()
    first_month_end = date.fromisoformat(me["paid_until"])
    assert first_month_end == next_due_after(today)
    registration = [p for p in me["payments"] if p["kind"] == "REGISTRATION"][0]
    assert registration["period_start"] == today.isoformat()

    # Il peut publier tout de suite, sans payer de cotisation ce mois-ci
    project = await client.post(
        "/members/me/projects",
        headers=headers,
        json={"title": "Atelier", "summary": "Atelier de lecture", "description": "Détails", "pillar": "EDUCATION", "beneficiaries": "Enfants"},
    )
    assert project.status_code == 201, project.text

    # Refusée puis validée à nouveau : pas de second mois offert
    await client.post(f"/members/admin/{member_id}/reject", headers=tana_admin, json={"reason": "Erreur de saisie"})
    assert (await client.post(f"/members/admin/{member_id}/approve", headers=tana_admin)).status_code == 204
    me = (await client.get("/members/me", headers=headers)).json()
    assert date.fromisoformat(me["paid_until"]) == first_month_end


async def test_declined_card_records_nothing(client, branch_ids):
    tokens = await _register(client, branch_ids["Antananarivo"])
    headers = bearer(tokens["access_token"])
    response = await client.post(
        "/members/me/payments/card",
        headers=headers,
        json={"kind": "REGISTRATION", "currency": "USD", "payment_token": "sim_tok_declined"},
    )
    assert response.status_code == 402
    assert (await client.get("/members/me", headers=headers)).json()["payments"] == []


async def test_cash_monthly_fee_confirmed_by_admin_gives_one_month(client, branch_ids, tana_admin):
    tokens = await _register(client, branch_ids["Antananarivo"])
    headers = bearer(tokens["access_token"])
    await _pay_registration_by_card(client, headers)
    await client.post(f"/members/admin/{tokens['user']['id']}/approve", headers=tana_admin)

    declared = await client.post("/members/me/payments/cash", headers=headers, json={"kind": "MONTHLY", "currency": "MGA"})
    assert declared.status_code == 201
    assert declared.json()["monthly_pending"] is True
    assert declared.json()["has_access"] is True  # premier mois offert par l'inscription
    duplicate = await client.post("/members/me/payments/cash", headers=headers, json={"kind": "MONTHLY", "currency": "MGA"})
    assert duplicate.status_code == 409

    pending = await client.get("/members/admin/payments", headers=tana_admin, params={"status": "PENDING", "member_id": tokens["user"]["id"]})
    [payment] = pending.json()["items"]
    assert payment["amount"] == 10_000
    confirmed = await client.post(f"/members/admin/payments/{payment['id']}/confirm", headers=tana_admin)
    assert confirmed.status_code == 200, confirmed.text

    me = (await client.get("/members/me", headers=headers)).json()
    assert me["has_access"] is True
    # Cotisation payée pendant le premier mois (offert par l'inscription) : elle couvre jusqu'à l'échéance suivante
    today = datetime.now(timezone.utc).date()
    assert date.fromisoformat(me["paid_until"]) == next_due_after(next_due_after(today))
    assert (await client.get("/auth/me", headers=headers)).json()["member_access"] is True


async def test_mobile_money_is_in_ariary_and_can_be_rejected(client, branch_ids, tana_admin):
    tokens = await _register(client, branch_ids["Antananarivo"])
    headers = bearer(tokens["access_token"])
    reference = f"MP{uuid.uuid4().hex[:10].upper()}"
    response = await client.post(
        "/members/me/payments/mobile-money",
        headers=headers,
        json={"kind": "REGISTRATION", "operator": "MVOLA", "sender_phone": "034 12 345 67", "transaction_reference": reference},
    )
    assert response.status_code == 201, response.text
    payment = response.json()["payments"][0]
    assert (payment["currency"], payment["amount"], payment["status"]) == ("MGA", 50_000, "PENDING")

    rejected = await client.post(
        f"/members/admin/payments/{payment['id']}/reject", headers=tana_admin, json={"reason": "Transaction introuvable"}
    )
    assert rejected.status_code == 200
    # Paiement rejeté : le membre peut en déclarer un autre, mais pas réutiliser la référence
    reuse = await client.post(
        "/members/me/payments/mobile-money",
        headers=headers,
        json={"kind": "REGISTRATION", "operator": "MVOLA", "sender_phone": "034 12 345 67", "transaction_reference": reference},
    )
    assert reuse.status_code == 409
    cash = await client.post("/members/me/payments/cash", headers=headers, json={"kind": "REGISTRATION", "currency": "MGA"})
    assert cash.status_code == 201


async def test_admin_member_list_is_scoped(client, branch_ids, tana_admin, paris_admin):
    tokens = await _register(client, branch_ids["Antananarivo"])
    email = tokens["user"]["email"]

    tana = await client.get("/members/admin", headers=tana_admin, params={"q": email})
    assert [m["email"] for m in tana.json()["items"]] == [email]
    paris = await client.get("/members/admin", headers=paris_admin, params={"q": email})
    assert paris.json()["items"] == []
    assert (await client.get("/members/admin", headers=bearer(tokens["access_token"]))).status_code == 403


async def test_member_project_needs_branch_admin_approval(client, branch_ids, tana_admin, paris_admin, super_admin):
    tokens = await _register(client, branch_ids["Antananarivo"])
    project = {
        "title": "Bibliothèque de quartier",
        "summary": "Une bibliothèque pour les enfants du quartier",
        "description": "Première ligne\n<script>alert(1)</script>",
        "pillar": "EDUCATION",
        "beneficiaries": "Enfants du quartier",
    }
    # Sans adhésion validée ni cotisation : refusé
    blocked = await client.post("/members/me/projects", headers=bearer(tokens["access_token"]), json=project)
    assert blocked.status_code == 403

    _, headers = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    created = await client.post("/members/me/projects", headers=headers, json=project)
    assert created.status_code == 201, created.text
    data = created.json()
    assert data["review_status"] == "PENDING"
    assert data["branch_id"] == branch_ids["Antananarivo"]
    assert "<script>" not in data["description"]

    assert (await client.get(f"/projects/{data['id']}")).status_code == 404
    # Le Super Admin est informé de la proposition
    notifications = (await client.get("/notifications", headers=super_admin)).json()["data"]
    assert any(data["title"] in n["message"] for n in notifications)
    # Seul l'admin de l'antenne du membre (ou le Super Admin) peut valider
    assert (await client.post(f"/projects/{data['id']}/approve", headers=paris_admin)).status_code == 403
    assert (await client.post(f"/projects/{data['id']}/approve", headers=tana_admin)).status_code == 200
    # Projet en cours : visible des membres à jour, pas des visiteurs
    assert (await client.get(f"/projects/{data['id']}", headers=headers)).status_code == 200
    assert (await client.get(f"/projects/{data['id']}")).status_code == 403

    mine = await client.get("/members/me/projects", headers=headers)
    assert [p["review_status"] for p in mine.json()] == ["APPROVED"]


async def test_project_discussion(client, branch_ids, tana_admin, paris_admin):
    projects = (await client.get("/projects", params={"page_size": 1})).json()["items"]
    project_id = projects[0]["id"]
    url = f"/projects/{project_id}/comments"

    # Visiteur, et membre sans cotisation : pas d'accès
    assert (await client.get(url)).status_code == 401
    pending = await _register(client, branch_ids["Antananarivo"])
    assert (await client.get(url, headers=bearer(pending["access_token"]))).status_code == 403

    alice_tokens, alice = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    _, bob = await _active_member(client, branch_ids["Paris"], paris_admin)

    first = await client.post(url, headers=alice, json={"body": "  Super projet !  "})
    assert first.status_code == 201, first.text
    comment = first.json()
    assert comment["body"] == "Super projet !"
    assert comment["can_delete"] is True

    reply = await client.post(url, headers=bob, json={"body": "Je confirme", "parent_id": comment["id"]})
    assert reply.status_code == 201
    nested = await client.post(url, headers=alice, json={"body": "Merci", "parent_id": reply.json()["id"]})
    assert nested.status_code == 400

    thread = [c for c in (await client.get(url, headers=bob)).json() if c["id"] == comment["id"]][0]
    assert [r["body"] for r in thread["replies"]] == ["Je confirme"]
    assert thread["can_delete"] is False

    # Bob ne peut pas supprimer le commentaire d'Alice ; l'auteure le peut
    assert (await client.delete(f"{url}/{comment['id']}", headers=bob)).status_code == 403
    assert (await client.delete(f"{url}/{comment['id']}", headers=alice)).status_code == 204
    assert alice_tokens["user"]["role"] == "MEMBER"


async def test_admin_records_cash_received_at_the_counter(client, branch_ids, tana_admin, paris_admin):
    tokens = await _register(client, branch_ids["Antananarivo"])
    member_id = tokens["user"]["id"]
    url = f"/members/admin/{member_id}/payments/cash"

    # Cotisation avant la validation : refusée ; autre antenne : refusé
    assert (await client.post(url, headers=tana_admin, json={"kind": "MONTHLY", "currency": "MGA"})).status_code == 400
    assert (await client.post(url, headers=paris_admin, json={"kind": "REGISTRATION", "currency": "MGA"})).status_code == 403
    assert (await client.post(url, headers=bearer(tokens["access_token"]), json={"kind": "REGISTRATION", "currency": "MGA"})).status_code == 403

    registration = await client.post(url, headers=tana_admin, json={"kind": "REGISTRATION", "currency": "EUR"})
    assert registration.status_code == 201, registration.text
    assert (registration.json()["status"], registration.json()["amount"]) == ("CONFIRMED", 10)
    assert (await client.post(url, headers=tana_admin, json={"kind": "REGISTRATION", "currency": "MGA"})).status_code == 409

    assert (await client.post(f"/members/admin/{member_id}/approve", headers=tana_admin)).status_code == 204
    monthly = await client.post(url, headers=tana_admin, json={"kind": "MONTHLY", "currency": "MGA"})
    assert monthly.status_code == 201
    assert monthly.json()["period_end"] is not None

    me = (await client.get("/members/me", headers=bearer(tokens["access_token"]))).json()
    assert me["has_access"] is True


async def test_admin_cash_refused_when_member_already_declared_it(client, branch_ids, tana_admin):
    tokens = await _register(client, branch_ids["Antananarivo"])
    headers = bearer(tokens["access_token"])
    await client.post("/members/me/payments/cash", headers=headers, json={"kind": "REGISTRATION", "currency": "MGA"})
    response = await client.post(
        f"/members/admin/{tokens['user']['id']}/payments/cash", headers=tana_admin, json={"kind": "REGISTRATION", "currency": "MGA"}
    )
    assert response.status_code == 409


async def test_member_project_with_optional_photo(client, branch_ids, tana_admin, request):
    import io

    from PIL import Image

    pending = await _register(client, branch_ids["Antananarivo"])
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), "green").save(buffer, format="PNG")
    png = buffer.getvalue()

    # Membre non validé : peut envoyer une photo (profil) mais pas proposer de projet
    assert (await client.post("/members/me/projects", headers=bearer(pending["access_token"]), json={})).status_code in (403, 422)

    _, headers = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    uploaded = await client.post("/upload/image", headers=headers, files={"file": ("p.png", png, "image/png")})
    assert uploaded.status_code == 200, uploaded.text
    url = uploaded.json()["url"]
    # Le stockage local écrit dans backend/uploads : ne pas y laisser l'image de test
    from tests.conftest import BACKEND_DIR

    from app.core.config import settings as app_settings

    stored = BACKEND_DIR / app_settings.UPLOAD_DIR / url.rsplit("/", 1)[-1]
    request.addfinalizer(lambda: stored.unlink(missing_ok=True))

    project = {"title": "Jardin", "summary": "Un jardin partagé", "description": "Détails", "pillar": "SOCIAL", "beneficiaries": "Voisins"}
    # Image qui n'a pas été envoyée par ce membre : refusée
    foreign = await client.post("/members/me/projects", headers=headers, json={**project, "image": "https://exemple.com/x.png"})
    assert foreign.status_code == 400

    with_photo = await client.post("/members/me/projects", headers=headers, json={**project, "image": url})
    assert with_photo.status_code == 201, with_photo.text
    assert with_photo.json()["images"] == [url]

    without_photo = await client.post("/members/me/projects", headers=headers, json=project)
    assert without_photo.status_code == 201
    assert without_photo.json()["images"] == []


def test_due_dates_fall_on_the_30th():
    assert next_due_after(date(2026, 10, 25)) == date(2026, 10, 30)
    assert next_due_after(date(2026, 10, 30)) == date(2026, 11, 30)
    assert next_due_after(date(2026, 10, 31)) == date(2026, 11, 30)
    assert next_due_after(date(2026, 12, 30)) == date(2027, 1, 30)
    # Février : dernier jour du mois
    assert next_due_after(date(2027, 1, 30)) == date(2027, 2, 28)
    assert next_due_after(date(2028, 2, 1)) == date(2028, 2, 29)
    assert next_due_after(date(2027, 2, 28)) == date(2027, 3, 30)


async def _set_paid_until(member_id: int, day: date) -> None:
    async with AsyncSessionLocal() as db:
        await db.execute(update(User).where(User.id == member_id).values(paid_until=day))
        await db.commit()


async def test_unpaid_member_is_suspended_then_reactivated_by_branch_admin(client, branch_ids, tana_admin, paris_admin):
    tokens, headers = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    member_id = tokens["user"]["id"]
    today = datetime.now(timezone.utc).date()

    # Échéance passée sans paiement : désactivé automatiquement
    await _set_paid_until(member_id, today - timedelta(days=1))
    me = (await client.get("/members/me", headers=headers)).json()
    assert (me["membership_status"], me["has_access"]) == ("SUSPENDED", False)
    project = {"title": "T", "summary": "S", "description": "D", "pillar": "SOCIAL", "beneficiaries": "B"}
    assert (await client.post("/members/me/projects", headers=headers, json=project)).status_code == 403
    # Il peut encore se connecter et voir son espace
    assert (await client.get("/auth/me", headers=headers)).status_code == 200

    # Réactivation impossible tant que le mois n'est pas payé ; « Valider » ne s'applique pas
    assert (await client.post(f"/members/admin/{member_id}/reactivate", headers=tana_admin)).status_code == 400
    assert (await client.post(f"/members/admin/{member_id}/approve", headers=tana_admin)).status_code == 400

    # Paiement en retard : seul le mois en cours est dû (couvert jusqu'à la prochaine échéance)
    paid = await client.post(
        "/members/me/payments/card",
        headers=headers,
        json={"kind": "MONTHLY", "currency": "MGA", "payment_token": "sim_tok_success"},
    )
    assert paid.status_code == 201, paid.text
    assert paid.json()["paid_until"] == next_due_after(today).isoformat()
    # Payé mais pas encore réactivé : toujours sans accès
    assert paid.json()["membership_status"] == "SUSPENDED"
    assert paid.json()["has_access"] is False

    assert (await client.post(f"/members/admin/{member_id}/reactivate", headers=paris_admin)).status_code == 403
    assert (await client.post(f"/members/admin/{member_id}/reactivate", headers=tana_admin)).status_code == 204
    me = (await client.get("/members/me", headers=headers)).json()
    assert (me["membership_status"], me["has_access"]) == ("ACTIVE", True)


async def test_admin_list_shows_overdue_members_as_suspended(client, branch_ids, tana_admin):
    tokens, _ = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    await _set_paid_until(tokens["user"]["id"], datetime.now(timezone.utc).date() - timedelta(days=1))
    listed = await client.get("/members/admin", headers=tana_admin, params={"q": tokens["user"]["email"]})
    assert [m["membership_status"] for m in listed.json()["items"]] == ["SUSPENDED"]


async def test_ongoing_projects_and_author_email_are_for_members(client, branch_ids, tana_admin):
    ongoing = {
        "title": f"En cours {uuid.uuid4().hex[:6]}", "summary": "S", "description": "<p>D</p>",
        "pillar": "SOCIAL", "phase": "ONGOING", "beneficiaries": "B", "branch_id": branch_ids["Antananarivo"],
    }
    created = (await client.post("/projects", headers=tana_admin, json=ongoing)).json()
    completed = (await client.post(
        "/projects", headers=tana_admin,
        json={**ongoing, "title": f"Réalisé {uuid.uuid4().hex[:6]}", "phase": "COMPLETED", "end_date": "2026-09-30"},
    )).json()

    # Visiteur : pas de projets en cours ; réalisations avec le nom de l'auteur, sans son email
    assert (await client.get(f"/projects/{created['id']}")).json()["detail"] == "MEMBERS_ONLY"
    assert (await client.get(f"/projects/{created['id']}")).status_code == 403
    visitor_list = (await client.get("/projects", params={"phase": "ONGOING", "page_size": 100})).json()
    assert visitor_list["items"] == []
    public = (await client.get(f"/projects/{completed['id']}")).json()
    assert public["author_name"] and public["author_email"] is None and public["author_phone"] is None

    # Membre sans cotisation à jour : comme un visiteur
    pending = await _register(client, branch_ids["Antananarivo"])
    assert (await client.get(f"/projects/{created['id']}", headers=bearer(pending["access_token"]))).status_code == 403

    # Membre à jour : voit les projets en cours et l'email de l'auteur
    _, headers = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    seen = await client.get(f"/projects/{created['id']}", headers=headers)
    assert seen.status_code == 200
    assert seen.json()["author_email"] == "antananarivo@cem-madagascar.org"

    # Projet d'un membre : son téléphone est visible des membres, pas des visiteurs
    member_tokens, member_headers = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    proposal = (await client.post(
        "/members/me/projects", headers=member_headers,
        json={"title": "Avec téléphone", "summary": "S", "description": "D", "pillar": "SOCIAL", "beneficiaries": "B"},
    )).json()
    await client.post(f"/projects/{proposal['id']}/approve", headers=tana_admin)
    assert (await client.get(f"/projects/{proposal['id']}", headers=headers)).json()["author_phone"] == "034 12 345 67"
    assert member_tokens["user"]["role"] == "MEMBER"
    member_list = (await client.get("/projects", headers=headers, params={"phase": "ONGOING", "page_size": 100})).json()
    assert created["id"] in [p["id"] for p in member_list["items"]]


async def test_member_profile_and_discussions(client, branch_ids, tana_admin):
    tokens, headers = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    me = (await client.get("/members/me", headers=headers)).json()
    assert me["member_number"] == tokens["user"]["id"]
    assert me["member_since"]

    updated = await client.patch(
        "/members/me/profile", headers=headers, json={"first_name": " Rova ", "last_name": "Rabe", "phone": ""}
    )
    assert updated.status_code == 204
    profile = (await client.get("/auth/me", headers=headers)).json()
    assert (profile["first_name"], profile["last_name"]) == ("Rova", "Rabe")

    project_id = (await client.get("/projects", params={"page_size": 1})).json()["items"][0]["id"]
    assert (await client.get("/members/me/discussions", headers=headers)).json() == []
    await client.post(f"/projects/{project_id}/comments", headers=headers, json={"body": "Bravo"})
    [discussion] = (await client.get("/members/me/discussions", headers=headers)).json()
    assert discussion["project_id"] == project_id
    assert discussion["my_comments"] == 1


async def test_member_avatar(client, branch_ids, request):
    import io

    from PIL import Image

    from app.core.config import settings as app_settings
    from tests.conftest import BACKEND_DIR

    tokens = await _register(client, branch_ids["Antananarivo"])
    headers = bearer(tokens["access_token"])
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), "blue").save(buffer, format="PNG")
    uploaded = await client.post("/upload/image", headers=headers, files={"file": ("a.png", buffer.getvalue(), "image/png")})
    assert uploaded.status_code == 200, uploaded.text
    url = uploaded.json()["url"]
    stored = BACKEND_DIR / app_settings.UPLOAD_DIR / url.rsplit("/", 1)[-1]
    request.addfinalizer(lambda: stored.unlink(missing_ok=True))

    assert (await client.put("/members/me/avatar", headers=headers, json={"avatar_url": "https://x.org/a.png"})).status_code == 400
    assert (await client.put("/members/me/avatar", headers=headers, json={"avatar_url": url})).status_code == 204
    assert (await client.get("/auth/me", headers=headers)).json()["avatar_url"] == url
    assert (await client.put("/members/me/avatar", headers=headers, json={"avatar_url": None})).status_code == 204
    assert (await client.get("/auth/me", headers=headers)).json()["avatar_url"] is None
