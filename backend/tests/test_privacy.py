"""Données personnelles : export, suppression du compte (anonymisation) et durées de conservation."""

from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, update

from app.db.session import AsyncSessionLocal
from app.models import AuditLog, MembershipPayment, NewsletterSubscriber, User
from app.services.privacy import anonymize_expired_accounts, purge_old_audit_logs
from tests.test_members import _register
from tests.test_membership import _active_member


async def test_member_exports_own_data(client, branch_ids, tana_admin):
    tokens, headers = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    response = await client.get("/members/me/export", headers=headers)
    assert response.status_code == 200
    assert "attachment" in response.headers["content-disposition"]
    data = response.json()
    assert data["account"]["email"] == tokens["user"]["email"]
    assert data["account"]["branch"] == "Antananarivo"
    assert {p["kind"] for p in data["membership_payments"]} == {"REGISTRATION", "MONTHLY"}


async def test_member_deletes_account(client, branch_ids, tana_admin):
    tokens, headers = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    member_id, email = tokens["user"]["id"], tokens["user"]["email"]
    badge = (await client.get("/badges/me", headers=headers)).json()["token"]
    async with AsyncSessionLocal() as db:
        db.add(NewsletterSubscriber(email=email))
        await db.commit()

    wrong = await client.post("/members/me/delete", headers=headers, json={"password": "pas-le-bon"})
    assert wrong.status_code == 400
    assert (await client.post("/members/me/delete", headers=headers, json={"password": "MotDePasse123!"})).status_code == 204

    # Plus de session, plus de connexion, plus de badge, plus dans la liste des membres
    assert (await client.get("/auth/me", headers=headers)).status_code == 401
    login = await client.post("/auth/login", json={"email": email, "password": "MotDePasse123!"})
    assert login.status_code == 401
    assert (await client.get(f"/badges/verify/{badge}")).status_code == 404
    listed = (await client.get("/members/admin", headers=tana_admin, params={"q": "supprim", "page_size": 100})).json()
    assert member_id not in [m["id"] for m in listed["items"]]

    async with AsyncSessionLocal() as db:
        user = await db.get(User, member_id)
        assert (user.first_name, user.last_name, user.phone, user.hashed_password) == ("Membre", "supprimé", None, None)
        assert user.email == f"supprime-{member_id}@anonyme.invalid"
        assert user.anonymized_at is not None
        # Les cotisations restent (comptabilité), sans coordonnées personnelles
        payments = (await db.scalars(select(MembershipPayment).where(MembershipPayment.user_id == member_id))).all()
        assert len(payments) == 2 and all(p.sender_phone is None for p in payments)
        assert await db.scalar(select(func.count()).select_from(NewsletterSubscriber).where(NewsletterSubscriber.email == email)) == 0


async def test_expired_accounts_are_anonymized(client, branch_ids, tana_admin):
    old_pending = (await _register(client, branch_ids["Antananarivo"]))["user"]["id"]
    recent_pending = (await _register(client, branch_ids["Antananarivo"]))["user"]["id"]
    former, _ = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    active, active_headers = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        await db.execute(update(User).where(User.id == old_pending).values(created_at=now - timedelta(days=400)))
        await db.execute(
            update(User).where(User.id == former["user"]["id"])
            .values(membership_status="SUSPENDED", paid_until=(now - timedelta(days=4 * 365)).date())
        )
        await db.commit()
        assert await anonymize_expired_accounts(db) >= 2

    async with AsyncSessionLocal() as db:
        anonymized = {u.id: u.anonymized_at is not None for u in (await db.scalars(
            select(User).where(User.id.in_([old_pending, recent_pending, former["user"]["id"], active["user"]["id"]]))
        )).all()}
    assert anonymized == {old_pending: True, recent_pending: False, former["user"]["id"]: True, active["user"]["id"]: False}
    assert (await client.get("/auth/me", headers=active_headers)).status_code == 200


async def test_old_audit_entries_are_purged():
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    async with AsyncSessionLocal() as db:
        db.add_all([
            AuditLog(action="login", resource_type="user", user_email="ancien@test.cem", created_at=now - timedelta(days=400)),
            AuditLog(action="login", resource_type="user", user_email="recent@test.cem", created_at=now - timedelta(days=10)),
        ])
        await db.commit()
        assert await purge_old_audit_logs(db) >= 1
        emails = set((await db.scalars(select(AuditLog.user_email).where(AuditLog.user_email.like("%@test.cem")))).all())
    assert "ancien@test.cem" not in emails and "recent@test.cem" in emails


async def test_admin_cannot_use_member_privacy_routes(client, tana_admin):
    assert (await client.get("/members/me/export", headers=tana_admin)).status_code == 403
    assert (await client.post("/members/me/delete", headers=tana_admin, json={"password": "x"})).status_code == 403


async def test_export_requires_authentication(client):
    assert (await client.get("/members/me/export")).status_code == 401
