# Club Excellence Madagascar — Plateforme de co-développement local

Stack : **React + Tailwind CSS** (frontend), **FastAPI** (backend), **PostgreSQL** (base de données).

## Prérequis

- Node.js 20+
- Python 3.12
- Docker Desktop (pour PostgreSQL en local) — ou une instance PostgreSQL déjà installée

## 1. Base de données

```bash
docker compose up -d
```

Démarre PostgreSQL sur `localhost:5432` (utilisateur `cem`, mot de passe `cem`, base `cem`).

## 2. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
./.venv/Scripts/activate      # PowerShell : .venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env        # puis éditez .env si besoin (voir OAuth ci-dessous)

alembic upgrade head           # applique le schéma de base de données
python -m app.seed             # peuple des données de démonstration

uvicorn app.main:app --reload --port 8000
```

L'API est disponible sur http://localhost:8000, documentation interactive sur http://localhost:8000/docs.

### Comptes de démonstration (créés par `app.seed`)

| Email | Mot de passe | Rôle |
|---|---|---|
| fanja@cem.mg | password123 | contributor |
| tojo@cem.mg | password123 | contributor |
| admin@cem.mg | password123 | admin |

### Connexion Google (OAuth)

La connexion Google est déjà câblée côté backend et frontend, mais nécessite vos propres identifiants :

1. Créez un client OAuth 2.0 sur [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Ajoutez `http://localhost:8000/api/v1/auth/oauth/google/callback` comme URI de redirection autorisée.
3. Renseignez `GOOGLE_CLIENT_ID` et `GOOGLE_CLIENT_SECRET` dans `backend/.env`.

Sans ces identifiants, l'inscription/connexion par email + mot de passe fonctionne normalement ; seul le bouton « Continuer avec Google » échouera.

## 3. Frontend (React + Tailwind)

```bash
cd frontend
npm install
npm run dev
```

Disponible sur http://localhost:5173 (le dev-server proxie automatiquement `/api` vers `http://localhost:8000`).

## Structure du projet

- `backend/app/` — API FastAPI (modèles SQLAlchemy, schémas Pydantic, endpoints, migrations Alembic)
- `frontend/src/` — application React (pages, composants, i18n FR/EN, client API)
- `docker-compose.yml` — service PostgreSQL pour le développement local

## Périmètre de cette itération

Implémenté : page d'accueil complète (recherche, projets récents, publications, appels à participation, mélangeur d'idées), authentification email/mot de passe + Google OAuth, i18n FR/EN.

Non implémenté (prochaines itérations) : pages complètes Projets / Ressources / Événements (routes stub actuellement), upload de fichiers réel pour les publications, modération du fil d'idées.
