"""Isolation entre antennes et droits du Super Admin."""

import io

from PIL import Image


def _png() -> bytes:
    buffer = io.BytesIO()
    Image.new("RGB", (8, 8), "red").save(buffer, format="PNG")
    return buffer.getvalue()


POST = {"title": "Post de test", "content": "<p>Contenu</p>", "pillar": "EDUCATION", "status": "PUBLISHED", "images": []}


async def test_branch_admin_cannot_post_in_another_branch(client, tana_admin, branch_ids):
    response = await client.post(f"/branches/{branch_ids['Paris']}/posts", headers=tana_admin, json=POST)
    assert response.status_code == 403


async def test_branch_admin_cannot_edit_another_branch_post(client, tana_admin, paris_admin, branch_ids):
    created = await client.post(f"/branches/{branch_ids['Paris']}/posts", headers=paris_admin, json=POST)
    assert created.status_code == 201
    post_id = created.json()["id"]

    assert (await client.put(f"/posts/{post_id}", headers=tana_admin, json={"title": "Piraté"})).status_code == 403
    assert (await client.delete(f"/posts/{post_id}", headers=tana_admin)).status_code == 403
    assert (await client.delete(f"/posts/{post_id}", headers=paris_admin)).status_code == 204


async def test_super_admin_only_routes(client, tana_admin):
    for path in ("/super-admin/admins", "/super-admin/audit", "/super-admin/statistics"):
        assert (await client.get(path, headers=tana_admin)).status_code == 403, path
    assert (await client.put("/settings/payment-info", headers=tana_admin, json={"mvola_number": "0340000000"})).status_code == 403


async def test_anonymous_is_rejected(client, branch_ids):
    assert (await client.get("/donations")).status_code == 401
    assert (await client.post(f"/branches/{branch_ids['Paris']}/posts", json=POST)).status_code == 401


async def test_branch_admin_limited_branch_fields(client, tana_admin, super_admin, branch_ids):
    tana = branch_ids["Antananarivo"]
    forbidden = await client.put(f"/branches/{tana}", headers=tana_admin, json={"name": "Autre", "status": "inactive"})
    assert forbidden.status_code == 403

    allowed = await client.put(f"/branches/{tana}", headers=tana_admin, json={"contact_phone": "034 11 222 33"})
    assert allowed.status_code == 200

    other = await client.put(f"/branches/{branch_ids['Paris']}", headers=tana_admin, json={"contact_phone": "0"})
    assert other.status_code == 403

    assert (await client.put(f"/branches/{tana}", headers=super_admin, json={"status": "active"})).status_code == 200


async def test_uploaded_file_can_only_be_deleted_by_its_branch(client, tana_admin, paris_admin, super_admin):
    upload = await client.post(
        "/upload/image", headers=tana_admin, files={"file": ("test.png", _png(), "image/png")}
    )
    assert upload.status_code == 200, upload.text
    filename = upload.json()["filename"]

    assert (await client.delete(f"/upload/{filename}", headers=paris_admin)).status_code == 403
    assert (await client.delete(f"/upload/{filename}", headers=tana_admin)).status_code == 204

    other = await client.post("/upload/image", headers=tana_admin, files={"file": ("b.png", _png(), "image/png")})
    assert (await client.delete(f"/upload/{other.json()['filename']}", headers=super_admin)).status_code == 204


async def test_upload_rejects_fake_image(client, tana_admin):
    response = await client.post(
        "/upload/image", headers=tana_admin, files={"file": ("x.png", b"not an image", "image/png")}
    )
    assert response.status_code == 400


async def test_branch_with_admins_cannot_be_deleted(client, super_admin, branch_ids):
    response = await client.delete(f"/branches/{branch_ids['Antananarivo']}", headers=super_admin)
    assert response.status_code == 409


async def test_submission_isolation(client, tana_admin, branch_ids):
    paris = branch_ids["Paris"]
    created = await client.post(
        f"/branches/{paris}/submissions",
        json={"applicant_name": "Jean Test", "email": "jean@test.cem", "project_summary": "Un projet"},
    )
    assert created.status_code == 201, created.text
    assert (await client.get("/submissions", headers=tana_admin, params={"branch_id": paris})).status_code == 403
    assert (await client.delete(f"/branches/{paris}/submissions/{created.json()['id']}", headers=tana_admin)).status_code == 403
