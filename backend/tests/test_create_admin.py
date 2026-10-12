"""Commande `python -m app.create_admin` : premier Super Admin en production, déblocage d'un compte."""

import os
import subprocess
import sys
import uuid

from tests.conftest import BACKEND_DIR, bearer, login


def run_command(*args: str) -> subprocess.CompletedProcess:
    return subprocess.run(
        [sys.executable, "-m", "app.create_admin", *args],
        cwd=BACKEND_DIR, env=os.environ.copy(), capture_output=True, text=True,
    )


def temporary_password(result: subprocess.CompletedProcess) -> str:
    assert result.returncode == 0, result.stderr
    line = next(line for line in result.stdout.splitlines() if line.startswith("Mot de passe temporaire : "))
    return line.removeprefix("Mot de passe temporaire : ")


async def test_create_super_admin_then_reset_password(client):
    email = f"Chef-{uuid.uuid4().hex[:8]}@Test.cem"

    password = temporary_password(run_command(email, "--first-name", "Rasoa", "--last-name", "Be"))
    session = await login(client, email.lower(), password)
    assert session["user"]["role"] == "SUPER_ADMIN"
    assert session["user"]["must_change_password"] is True

    duplicate = run_command(email.upper())
    assert duplicate.returncode == 1
    assert "existe déjà" in duplicate.stderr

    new_password = temporary_password(run_command(email, "--reset-password"))
    assert (await client.get("/auth/me", headers=bearer(session["access_token"]))).status_code == 401
    assert (await client.post("/auth/login", json={"email": email, "password": password})).status_code == 401
    await login(client, email, new_password)


def test_rejects_invalid_email_and_unknown_account():
    assert run_command("pas-un-email").returncode == 2
    unknown = run_command(f"inconnu-{uuid.uuid4().hex[:8]}@test.cem", "--reset-password")
    assert unknown.returncode == 1
    assert "Aucun compte" in unknown.stderr
