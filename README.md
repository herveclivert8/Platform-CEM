# Club Excellence Madagascar — Plateforme de co-développement local

Stack : **React + Tailwind CSS** (frontend), **FastAPI** (backend), **PostgreSQL** (base de données).

## Prérequis

- Node.js 20+
- **Python 3.12** — les versions plus récentes (3.13, 3.14) ne sont pas supportées : `pillow==10.4.0` n'a pas de paquet pré-compilé pour elles et l'installation échoue. Si votre système a une autre version, utilisez [uv](https://docs.astral.sh/uv/) (voir ci-dessous).
- Docker (Docker Desktop sous Windows/macOS, Docker Engine sous Linux) — ou une instance PostgreSQL déjà installée

Il faut **trois terminaux** : base de données, backend, frontend.

## 1. Base de données (PostgreSQL)

```bash
docker compose up -d
docker compose ps        # le service "db" doit être "healthy"
```

Démarre PostgreSQL sur `localhost:5432` (utilisateur `cem`, mot de passe `cem`, base `cem`). Les données sont conservées dans un volume Docker ; `docker compose down` arrête la base sans les effacer.

> **Linux — `permission denied ... /var/run/docker.sock`** : votre utilisateur n'est pas dans le groupe `docker`.
> ```bash
> sudo usermod -aG docker $USER
> ```
> Puis **déconnectez-vous et reconnectez-vous** (ou redémarrez). Vérifiez avec `id` que `docker` apparaît dans la liste des groupes.

## 2. Backend (FastAPI)

### Installation (une seule fois)

**Linux / macOS**

```bash
cd backend
python3.12 -m venv .venv

source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env           # puis éditez SECRET_KEY
```

Si `python3.12` n'est pas installé, utilisez uv à la place des lignes `venv` / `pip` :

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh   # puis ouvrez un nouveau terminal
uv venv --python 3.12 .venv
source .venv/bin/activate
uv pip install -r requirements.txt
```

**Windows (PowerShell)**

```powershell
cd backend
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

### Base de données et données de démo (une seule fois)

```bash
alembic upgrade head           # crée les tables
python -m app.seed             # ajoute les données de démonstration
```

> `app.seed` s'exécute **une seule fois**, sur une base vide : le relancer crée des doublons.

**Après chaque `git pull`**, appliquez les éventuelles nouvelles migrations (sinon le backend plante sur des colonnes manquantes) :

```bash
alembic upgrade head
```

### Lancement

```bash
cd backend
source .venv/bin/activate      # Windows : .venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

L'API est disponible sur http://localhost:8000, documentation interactive sur http://localhost:8000/docs.

Redis est optionnel (`USE_REDIS=false` par défaut) : sans lui, la limite de requêtes est gérée en mémoire.

### Comptes de démonstration (créés par `app.seed`)

La page de connexion n'est pas liée depuis le site public : les admins s'y rendent directement à l'adresse `/login` (par ex. http://localhost:5173/login). Une fois connecté, le lien « Espace Admin » apparaît dans la barre de navigation.

| Email | Mot de passe | Rôle |
|---|---|---|
| super.admin@cem-madagascar.org | SuperAdmin123! | super admin |
| antananarivo@cem-madagascar.org | BranchAdmin123! | admin d'antenne (Antananarivo) |
| fianarantsoa@cem-madagascar.org | BranchAdmin123! | admin d'antenne (Fianarantsoa) |
| paris@cem-madagascar.org | BranchAdmin123! | admin d'antenne (Paris) |
| lyon@cem-madagascar.org | BranchAdmin123! | admin d'antenne (Lyon) |

### Variables d'environnement

Fichier `backend/.env`, créé à partir de [`backend/.env.example`](backend/.env.example). Il contient des secrets : il est ignoré par git et ne doit jamais être publié.

| Variable | Obligatoire | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | Connexion PostgreSQL (valeur de `.env.example` = base Docker) |
| `SECRET_KEY` | oui | Signature des jetons de connexion. Générez-en une : `python -c "import secrets; print(secrets.token_urlsafe(48))"` |
| `ENVIRONMENT` | non | `development` (défaut) ou `production` |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `FROM_EMAIL`, `FROM_NAME` | non | Envoi des emails (voir ci-dessous) |
| `CARD_PAYMENT_PROVIDER` | non | `simulation` (défaut) ou `disabled` — voir [Dons](#dons) |
| `USE_REDIS`, `REDIS_URL` | non | Redis pour la limite de requêtes (désactivé par défaut ; `USE_REDIS=true` pour l'utiliser) |

Redémarrez le backend après toute modification de `.env`.

### Emails (SMTP)

Le backend envoie des emails de remerciement aux donateurs et des liens de réinitialisation de mot de passe.

- **Sans SMTP configuré** (par défaut) : aucun email ne part. Leur contenu s'affiche dans le terminal du backend, sous `[EMAIL NON ENVOYÉ — SMTP non configuré]` — pratique en développement.
- **Pour envoyer de vrais emails**, ajoutez dans `backend/.env` (exemple Gmail) :

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=adresse.du.club@gmail.com
SMTP_PASSWORD=mot-de-passe-d-application
FROM_EMAIL=adresse.du.club@gmail.com
FROM_NAME=Club Excellence Madagascar
```

> Avec Gmail, `SMTP_PASSWORD` est un **mot de passe d'application** (compte Google → Sécurité → Validation en deux étapes → Mots de passe des applications), pas le mot de passe habituel. Pour un volume important, préférez un service dédié (Brevo, Mailjet…).

## 3. Frontend (React + Tailwind)

```bash
cd frontend
npm install                    # une seule fois
npm run dev
```

Disponible sur http://localhost:5173. Le serveur de dev redirige automatiquement `/api` et `/uploads` vers le backend (`http://localhost:8000`).

> Si la console affiche `http proxy error ... ECONNREFUSED` (ou des erreurs **502** dans le navigateur), c'est que le backend n'est pas lancé.

## Tests et qualité

Les tests du backend tournent sur une base dédiée **`cem_test`**, **supprimée puis recréée** à chaque lancement (migrations + données de démo). Ils refusent de démarrer sur une base dont le nom ne finit pas par `_test`.

L'utilisateur PostgreSQL doit pouvoir créer des bases : c'est le cas de `cem` dans la base Docker. Avec un PostgreSQL installé, accordez-le une fois : `ALTER ROLE cem CREATEDB;`

Puis, dans `backend/` (environnement virtuel activé) :

```bash
pip install -r requirements-dev.txt   # une seule fois : outils de test, de lint et d'audit
ruff check .                          # lint
pytest                                # tests
```

Autre base : `TEST_DATABASE_URL=postgresql+asyncpg://user:mdp@hote:5432/xxx_test pytest`.

Côté frontend : `npm run lint` puis `npm run build`.

**Intégration continue** : à chaque push et pull request, GitHub Actions ([`.github/workflows/ci.yml`](.github/workflows/ci.yml)) lance le lint et les tests du backend, le lint et le build du frontend, puis construit les deux images Docker. Le résultat s'affiche dans l'onglet *Actions* du dépôt et sur chaque pull request.

## Déploiement (Docker)

Chaque partie a son image : [`backend/Dockerfile`](backend/Dockerfile) (API, applique les migrations au démarrage) et [`frontend/Dockerfile`](frontend/Dockerfile) (site compilé, servi par nginx, qui relaie `/api` et `/uploads` vers l'API). [`docker-compose.prod.yml`](docker-compose.prod.yml) assemble base de données, Redis, API et site :

```bash
cp .env.production.example .env.production   # puis renseignez POSTGRES_PASSWORD, SECRET_KEY et FRONTEND_URL
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Le site est alors servi sur le port 8080 (`HTTP_PORT` pour en changer). Pour une mise en ligne publique, placez un serveur HTTPS devant (Caddy, Traefik, ou le proxy de l'hébergeur). La base et les images envoyées sont conservées dans des volumes Docker.

> Le paiement par carte y est désactivé (`CARD_PAYMENT_PROVIDER=disabled`) tant qu'aucun vrai prestataire n'est branché, et les données de démo ne sont pas chargées.

## Dons

Le bouton « Faire un don » (page d'accueil, pages d'antenne) propose deux moyens de paiement.

Le donateur choisit d'abord la **devise** — **ariary** (par défaut), **euro** ou **dollar US** :

| Devise | Moyens de paiement | Minimum par carte |
|---|---|---|
| Ariary (Ar) | Mobile Money ou carte | 5 000 Ar (100 Ar en Mobile Money) |
| Euro (€) | carte | 1 € |
| Dollar US ($) | carte | 1 $ |

Chaque don garde sa devise ; les totaux de l'admin sont affichés devise par devise. Aucune conversion n'est faite par le site.

### Carte bancaire (Ar, €, $) — simulée pour l'instant

Le don est payé en ligne et **confirmé automatiquement** ; le donateur reçoit un email de remerciement. Comme sur Stripe, le numéro de carte ne quitte jamais le navigateur : seul un jeton est envoyé au serveur.

Tant qu'aucun prestataire réel n'est branché, le paiement est **simulé** (`CARD_PAYMENT_PROVIDER=simulation`) : aucun argent ne circule, et seules ces cartes de test sont acceptées (date d'expiration future, CVC quelconque) :

| Carte | Résultat |
|---|---|
| `4242 4242 4242 4242` | Paiement accepté |
| `5555 5555 5555 4444` | Paiement accepté (Mastercard) |
| `4000 0000 0000 0002` | Carte refusée |
| `4000 0000 0000 9995` | Fonds insuffisants |

La simulation est **automatiquement désactivée si `ENVIRONMENT=production`**. Pour de vrais paiements, ajoutez un prestataire dans [`backend/app/services/payments.py`](backend/app/services/payments.py) et remplacez `tokenizeCard` dans [`frontend/src/lib/payments/card.ts`](frontend/src/lib/payments/card.ts) par le SDK du prestataire.

> ⚠️ Stripe n'accepte pas les structures enregistrées à Madagascar : il faut une entité dans un pays pris en charge (par exemple l'association en France), ou un autre prestataire.

### Mobile Money (Ar) — MVola, Orange Money, Airtel Money

Sans API opérateur : le site affiche le numéro et le nom du titulaire, le donateur envoie l'argent depuis son téléphone puis **déclare son paiement** (numéro qui a envoyé, référence reçue par SMS, montant). Le don est alors **« À vérifier »**.

Dans **Admin → Dons**, l'admin retrouve la transaction dans l'historique du compte Mobile Money (référence, numéro, montant, date), puis :

- **valide** le don (en corrigeant si besoin le montant ou la référence) → email de remerciement au donateur ;
- ou le **rejette** avec un motif (aucun email).

Il peut aussi enregistrer un paiement reçu sans déclaration (« Enregistrer un don reçu ») et supprimer un don non validé. Une même référence ne peut être déclarée qu'une fois par opérateur. Seuls les dons confirmés comptent dans les totaux.

### Configuration

Dans **Admin → Coordonnées de paiement** (super admin) : nom du titulaire et numéros MVola / Orange Money / Airtel Money. Un opérateur sans numéro n'est pas proposé aux donateurs.

> Les données de démo (`app.seed`) contiennent des **numéros fictifs** : remplacez-les par les vrais comptes de l'association avant toute utilisation réelle.

## Structure du projet

- `backend/app/` — API FastAPI (modèles SQLAlchemy, schémas Pydantic, endpoints, services)
- `backend/app/services/payments.py` — prestataire de paiement par carte (simulation)
- `backend/alembic/` — migrations de base de données
- `frontend/src/` — application React (pages publiques, espace `/admin`, composants, i18n, client API)
- `frontend/src/components/donation/` — formulaire de don (carte et Mobile Money)
- `backend/tests/` — tests automatiques (pytest)
- `docker-compose.yml` — service PostgreSQL pour le développement local
- `docker-compose.prod.yml`, `backend/Dockerfile`, `frontend/Dockerfile` — déploiement
- `.github/workflows/ci.yml` — intégration continue (lint, tests, build)

## Fonctionnalités

- **Site public** : page d'accueil, annuaire et carte des antennes (`/antennes`), page de chaque antenne et ses actualités, formulaire de dépôt de dossier entrepreneur, dons par carte ou Mobile Money.
- **Espace d'administration** (`/admin`) :
  - actualités (le super admin choisit l'antenne de publication) ;
  - dossiers entrepreneurs : consultation, ajout d'un dossier reçu hors du site, suppression ;
  - dons : vérification et validation des dons Mobile Money, rejet motivé, saisie manuelle, suppression des dons non validés ;
  - paramètres, profil de son antenne ;
  - pour le super admin : couverture de la page d'accueil (photo, bandeau, titre et sous-titre en français et en anglais), antennes, comptes admin, journal d'audit, réseaux sociaux, coordonnées de paiement.
- **Authentification** : email + mot de passe (JWT), mot de passe oublié / réinitialisation, deux niveaux de rôle (super admin, admin d'antenne).
- **Langues** : français et anglais (site public).
