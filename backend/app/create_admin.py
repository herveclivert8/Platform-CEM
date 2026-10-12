"""
Créer le premier Super Admin d'une base sans données de démo (production), ou débloquer un compte.

    python -m app.create_admin admin@exemple.org --first-name Prénom --last-name Nom
    python -m app.create_admin admin@exemple.org --reset-password

Affiche un mot de passe temporaire, à remplacer à la première connexion (comme les comptes créés
depuis l'admin). Sur Render : onglet « Shell » du service backend.

--reset-password : nouveau mot de passe temporaire pour un compte existant (oubli sans SMTP
configuré) ; toutes ses sessions ouvertes sont fermées.
"""

import argparse
import asyncio
import secrets
import sys

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import func, select

import app.models  # noqa: F401 - enregistre tous les modèles (relations de User)
from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models import User, UserRole
from app.services.audit import record_audit

AUDIT_SOURCE = "console (app.create_admin)"


class AdminCommandError(Exception):
    pass


async def create_super_admin(email: str, first_name: str, last_name: str) -> str:
    """Créer un Super Admin ; renvoie son mot de passe temporaire."""
    async with AsyncSessionLocal() as db:
        if await db.scalar(select(User).where(func.lower(User.email) == email)):
            raise AdminCommandError(f"Un compte existe déjà avec l'email {email} (voir --reset-password).")

        temporary_password = secrets.token_urlsafe(12)
        user = User(
            email=email,
            first_name=first_name,
            last_name=last_name,
            hashed_password=hash_password(temporary_password),
            role=UserRole.SUPER_ADMIN,
            must_change_password=True,
        )
        db.add(user)
        await db.flush()
        record_audit(
            db, user_email=AUDIT_SOURCE, action="create", resource_type="user", resource_id=user.id,
            details={"email": email, "role": UserRole.SUPER_ADMIN.value},
        )
        await db.commit()
        return temporary_password


async def reset_password(email: str) -> str:
    """Nouveau mot de passe temporaire pour un compte existant ; ferme toutes ses sessions."""
    async with AsyncSessionLocal() as db:
        user = await db.scalar(select(User).where(func.lower(User.email) == email))
        if not user:
            raise AdminCommandError(f"Aucun compte avec l'email {email}.")

        temporary_password = secrets.token_urlsafe(12)
        user.hashed_password = hash_password(temporary_password)
        user.must_change_password = True
        user.token_version += 1
        record_audit(
            db, user_email=AUDIT_SOURCE, action="password_reset", resource_type="user", resource_id=user.id,
            branch_id=user.branch_id, details={"email": user.email},
        )
        await db.commit()
        return temporary_password


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="python -m app.create_admin", description=__doc__.split("\n\n")[0])
    parser.add_argument("email")
    parser.add_argument("--first-name", default="Super")
    parser.add_argument("--last-name", default="Admin")
    parser.add_argument("--reset-password", action="store_true", help="compte existant : nouveau mot de passe temporaire")
    args = parser.parse_args(argv)

    try:
        email = TypeAdapter(EmailStr).validate_python(args.email.strip()).lower()
    except ValidationError:
        print(f"Email invalide : {args.email}", file=sys.stderr)
        return 2

    try:
        if args.reset_password:
            password = asyncio.run(reset_password(email))
            print(f"Mot de passe de {email} réinitialisé.")
        else:
            password = asyncio.run(create_super_admin(email, args.first_name.strip(), args.last_name.strip()))
            print(f"Super Admin {email} créé.")
    except AdminCommandError as exc:
        print(exc, file=sys.stderr)
        return 1

    print(f"Mot de passe temporaire : {password}")
    print("À changer à la première connexion (page /login). Il n'est affiché qu'une fois.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
