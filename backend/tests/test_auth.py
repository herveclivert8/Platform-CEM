from tests.conftest import PASSWORD, auth


async def test_login_returns_tokens_and_user(client, world):
    r = await client.post("/api/v1/auth/login", json={"email": "admin.a@test.org", "password": PASSWORD})
    assert r.status_code == 200
    body = r.json()
    assert body["access_token"] and body["refresh_token"]
    assert body["user"]["email"] == "admin.a@test.org"
    assert body["user"]["role"] == "BRANCH_ADMIN"


async def test_login_email_is_case_and_space_insensitive(client, world):
    r = await client.post("/api/v1/auth/login", json={"email": "  Admin.A@Test.org ", "password": PASSWORD})
    assert r.status_code == 200


async def test_login_wrong_password(client, world):
    r = await client.post("/api/v1/auth/login", json={"email": "admin.a@test.org", "password": "wrong"})
    assert r.status_code == 401


async def test_login_unknown_email(client, world):
    r = await client.post("/api/v1/auth/login", json={"email": "nobody@test.org", "password": PASSWORD})
    assert r.status_code == 401


async def test_me_requires_a_token(client, world):
    assert (await client.get("/api/v1/auth/me")).status_code == 401
    assert (await client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not-a-jwt"})).status_code == 401


async def test_me_returns_current_user(client, world):
    r = await client.get("/api/v1/auth/me", headers=auth(world.admin_b))
    assert r.status_code == 200
    assert r.json()["email"] == "admin.b@test.org"


async def test_refresh_gives_a_working_access_token(client, world):
    login = await client.post("/api/v1/auth/login", json={"email": "admin.a@test.org", "password": PASSWORD})
    r = await client.post("/api/v1/auth/refresh", json={"refresh_token": login.json()["refresh_token"]})
    assert r.status_code == 200
    me = await client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {r.json()['access_token']}"})
    assert me.status_code == 200


async def test_refresh_rejects_access_tokens_and_garbage(client, world):
    login = await client.post("/api/v1/auth/login", json={"email": "admin.a@test.org", "password": PASSWORD})
    access = login.json()["access_token"]
    assert (await client.post("/api/v1/auth/refresh", json={"refresh_token": access})).status_code == 401
    assert (await client.post("/api/v1/auth/refresh", json={"refresh_token": "garbage"})).status_code == 401


async def test_change_password(client, world):
    headers = auth(world.admin_a)
    wrong = await client.post("/api/v1/auth/password/change", headers=headers, json={
        "current_password": "wrong", "new_password": "NewPass456!", "confirm_password": "NewPass456!",
    })
    assert wrong.status_code == 401

    ok = await client.post("/api/v1/auth/password/change", headers=headers, json={
        "current_password": PASSWORD, "new_password": "NewPass456!", "confirm_password": "NewPass456!",
    })
    assert ok.status_code == 200
    login = await client.post("/api/v1/auth/login", json={"email": "admin.a@test.org", "password": "NewPass456!"})
    assert login.status_code == 200
