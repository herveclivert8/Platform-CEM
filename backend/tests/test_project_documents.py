"""Documents joints aux projets : formats, limites, rattachement et droits de téléchargement."""

from tests.conftest import bearer
from tests.test_members import _register
from tests.test_membership import _active_member

PDF = b"%PDF-1.4\n% test\n"
DOCX = b"PK\x03\x04" + b"\x00" * 40


async def _upload(client, headers, name="dossier.pdf", content=PDF, title=""):
    return await client.post(
        "/project-documents", headers=headers, files={"file": (name, content, "application/octet-stream")}, data={"title": title}
    )


async def test_upload_checks_format_and_size(client, branch_ids, tana_admin):
    ok = await _upload(client, tana_admin, title="Budget prévisionnel")
    assert ok.status_code == 201, ok.text
    assert ok.json()["title"] == "Budget prévisionnel" and ok.json()["content_type"] == "application/pdf"
    assert (await _upload(client, tana_admin, "plan.docx", DOCX)).json()["title"] == "plan"
    # Extension refusée, contenu qui ne correspond pas, fichier trop gros
    assert (await _upload(client, tana_admin, "virus.exe", b"MZ")).status_code == 400
    assert (await _upload(client, tana_admin, "faux.pdf", b"pas un pdf")).status_code == 400
    assert (await _upload(client, tana_admin, "gros.pdf", PDF + b"0" * (10 * 1024 * 1024))).status_code == 413
    # Membre sans cotisation à jour : refusé
    pending = await _register(client, branch_ids["Antananarivo"])
    assert (await _upload(client, bearer(pending["access_token"]))).status_code == 403


async def test_member_proposal_documents_and_access(client, branch_ids, tana_admin, paris_admin):
    _, author = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    _, other = await _active_member(client, branch_ids["Antananarivo"], tana_admin)
    doc = (await _upload(client, author, title="Dossier complet")).json()
    others_doc = (await _upload(client, other)).json()

    payload = {"title": "Avec dossier", "summary": "S", "description": "D", "pillar": "EDUCATION", "beneficiaries": "B"}
    # Un document envoyé par quelqu'un d'autre ne peut pas être joint ; 3 documents maximum
    bad = await client.post("/members/me/projects", headers=author, json={**payload, "document_ids": [others_doc["id"]]})
    assert bad.status_code == 400
    too_many = await client.post("/members/me/projects", headers=author, json={**payload, "document_ids": [1, 2, 3, 4]})
    assert too_many.status_code == 422

    project = (await client.post("/members/me/projects", headers=author, json={**payload, "document_ids": [doc["id"]]})).json()
    assert [d["title"] for d in project["documents"]] == ["Dossier complet"]

    url = f"/project-documents/{doc['id']}"
    # En attente : l'auteur et l'admin de l'antenne, pas les autres membres ni l'admin d'une autre antenne
    assert (await client.get(url, headers=author)).status_code == 200
    assert (await client.get(url, headers=tana_admin)).status_code == 200
    assert (await client.get(url, headers=other)).status_code == 404
    assert (await client.get(url, headers=paris_admin)).status_code == 404

    await client.post(f"/projects/{project['id']}/approve", headers=tana_admin)
    downloaded = await client.get(url, headers=other)
    assert downloaded.status_code == 200 and downloaded.content == PDF
    assert "attachment" in downloaded.headers["content-disposition"]
    # Les visiteurs ne voient pas les documents
    assert (await client.get(url)).status_code == 401
    # (projet en cours : réservé aux membres de toute façon ; la liste des documents est vide pour un visiteur)
    seen = (await client.get(f"/projects/{project['id']}", headers=other)).json()
    assert len(seen["documents"]) == 1


async def test_admin_project_documents_replace_and_hide_from_visitors(client, branch_ids, tana_admin):
    first = (await _upload(client, tana_admin, title="Rapport")).json()
    second = (await _upload(client, tana_admin, "annexe.docx", DOCX)).json()
    body = {
        "branch_id": branch_ids["Antananarivo"], "title": "Réalisation documentée", "summary": "S", "description": "<p>D</p>",
        "pillar": "SOCIAL", "phase": "COMPLETED", "beneficiaries": "B", "end_date": "2026-01-31",
        "document_ids": [first["id"], second["id"]],
    }
    created = await client.post("/projects", headers=tana_admin, json=body)
    assert created.status_code == 201, created.text
    project = created.json()
    assert [d["id"] for d in project["documents"]] == [first["id"], second["id"]]

    # Visiteur : la réalisation est publique mais sans documents
    assert (await client.get(f"/projects/{project['id']}")).json()["documents"] == []

    # Retirer un document le supprime
    updated = await client.put(f"/projects/{project['id']}", headers=tana_admin, json={"document_ids": [second["id"]]})
    assert [d["id"] for d in updated.json()["documents"]] == [second["id"]]
    assert (await client.get(f"/project-documents/{first['id']}", headers=tana_admin)).status_code == 404
