# Analyse du projet CEM — modifications et ajouts à faire

*Analyse réalisée le 25 septembre 2026, sur la branche `docs/setup-local`.*

## Synthèse

Le projet est une base saine : code lisible, permissions par antenne bien vérifiées côté serveur, contenu HTML des posts nettoyé avec DOMPurify avant affichage. Mais il n'est **pas prêt pour la production** :

- les dons sont enregistrés sans aucun paiement ;
- la limite anti-abus (nombre de requêtes par minute) se contourne facilement ;
- le journal d'audit reste toujours vide ;
- 87 failles de sécurité connues touchent les dépendances Python ;
- il n'y a aucun test.

Les points sont classés par priorité ; chacun est indépendant des autres.

---

## 🔴 Priorité 1 — Sécurité et bugs bloquants

### 1. ~~Les dons sont enregistrés sans paiement~~ — ✅ traité
Deux moyens de paiement : **carte bancaire** (paiement en ligne, confirmé automatiquement — pour l'instant en **mode simulation**) et **Mobile Money** (le donateur envoie l'argent depuis son téléphone puis déclare son numéro et la référence du SMS ; un admin vérifie dans l'historique du compte puis valide ou rejette). Email de remerciement à chaque don confirmé.

**Reste à faire pour de vrais paiements par carte :** brancher un prestataire réel dans `backend/app/services/payments.py` (Stripe exige une structure enregistrée dans un pays pris en charge, ex. l'association en France — **pas Madagascar**) et configurer SMTP pour que les emails partent réellement.

### 2. La limite de requêtes se contourne facilement
Dans [middleware/rate_limit.py](backend/app/middleware/rate_limit.py) :
- pour identifier le visiteur, le serveur fait confiance à l'en-tête `X-Forwarded-For`, envoyé par le visiteur lui-même. Il suffit de le changer à chaque requête pour ne jamais être limité ;
- les requêtes venant de `127.0.0.1` ne sont jamais limitées. Derrière un serveur intermédiaire comme nginx, toutes les requêtes semblent venir de `127.0.0.1` : il n'y aurait donc plus aucune limite en production.

**À faire :** ne faire confiance à cet en-tête que s'il vient d'un serveur intermédiaire connu. Ajouter une limite plus stricte sur `/auth/login`, `/auth/password/forgot` et les formulaires publics (dossiers, dons) contre la force brute et le spam.

### 3. Dépendances vulnérables
`pip-audit` trouve **87 failles connues dans 11 paquets Python** : `starlette 0.27`, `fastapi 0.104`, `python-multipart 0.0.6` (8 failles), `jinja2`, `pillow`, `gunicorn`, `anyio`, `python-dotenv`, `python-jose`, `ecdsa`, `pytest`.

**À faire :**
- mettre à jour FastAPI et Starlette ensemble, puis les autres paquets ;
- supprimer `python-jose`, qui n'est utilisé nulle part (c'est `PyJWT` qui sert) ;
- côté frontend, lancer `npm audit fix` (3 failles : `react-router`, `nanoid`, `postcss`).

### 4. La clé secrète a une valeur par défaut qui marche en production
Dans [config.py](backend/app/core/config.py), sans fichier `.env`, les jetons de connexion sont signés avec `"change-this-in-production..."`, une valeur publique. N'importe qui pourrait fabriquer un jeton super admin.

**À faire :** refuser de démarrer si `ENVIRONMENT=production` et que la clé est absente ou vaut la valeur par défaut.

### 5. Le journal d'audit est toujours vide
La fonction `log_audit` ([audit.py](backend/app/api/v1/endpoints/audit.py)) n'est appelée nulle part : la page `/admin/audit` n'affiche jamais rien.

**À faire :** l'appeler pour chaque connexion, création, modification ou suppression (posts, dossiers, antennes, comptes, liens sociaux).

### 6. Les sessions ne sont jamais révoquées
Dans [auth_jwt.py](backend/app/api/v1/endpoints/auth_jwt.py) :
- se déconnecter, changer ou réinitialiser son mot de passe n'invalide pas les jetons déjà émis : un jeton volé reste valable 7 jours ;
- supprimer un admin ne coupe pas sa session en cours.

**À faire :** enregistrer une version des jetons (ou une date de changement de mot de passe) par utilisateur, et la vérifier à chaque requête.

### 7. Les mots de passe temporaires ne sont jamais remplacés
Le mot de passe d'un nouvel admin ([admin.py](backend/app/api/v1/endpoints/admin.py)) s'affiche une fois à l'écran, et rien n'oblige à le changer.

**À faire :** obliger à définir un nouveau mot de passe à la première connexion, ou mieux, envoyer par email un lien pour créer son mot de passe.

### 8. Un admin d'antenne peut modifier plus que prévu
D'après la documentation du code ([branches.py](backend/app/api/v1/endpoints/branches.py), route `PUT /branches/{id}`), un admin d'antenne ne devrait modifier que photo, adresse, contact, résumé et équipe. En pratique, il peut aussi changer le **nom**, le **pays** et les **coordonnées GPS** de son antenne.

**À faire :** limiter les champs modifiables selon le rôle.

### 9. Suppression de fichiers sans contrôle
Avec `DELETE /upload/{filename}` ([upload.py](backend/app/api/v1/endpoints/upload.py)), n'importe quel admin peut supprimer n'importe quelle image, y compris celles d'une autre antenne.

**À faire :** enregistrer le propriétaire (ou l'antenne) de chaque fichier et vérifier les droits avant suppression.

---

## 🟠 Priorité 2 — Fonctionnalités manquantes ou incomplètes

### 10. ~~Le statut d'une antenne ne se modifie pas~~ — ✅ traité
Le super admin choisit le statut dans la page de modification de l'antenne (un admin d'antenne ne peut pas le changer) :
- **Active** : visible dans l'annuaire, reçoit dons et dossiers ;
- **Inactive** : retirée de l'annuaire ; sa page reste consultable avec la mention « antenne inactive », sans dons ni dépôt de dossiers (refusés aussi par le serveur) ;
- **En attente** : invisible pour le public (page, actualités) ; ses admins peuvent déjà préparer son contenu.

L'espace admin liste désormais les antennes de tous statuts (`GET /branches?include_inactive=true`, réservé au super admin), et plus seulement les actives. Depuis la liste des antennes, les boutons « Désactiver » / « Réactiver » changent le statut en un clic.

### 11. ~~Supprimer une antenne laisse des admins orphelins~~ — ✅ traité
La suppression est refusée tant que des comptes admin sont rattachés à l'antenne. Le message de confirmation précise ce qui est effacé (posts, dossiers, équipe ; les dons sont conservés) et conseille de passer plutôt l'antenne en « Inactive ».

### 12. ~~L'envoi d'emails bloque le serveur~~ — ✅ en partie traité
[email.py](backend/app/core/email.py) utilise `smtplib` de façon bloquante, sans délai maximum, dans du code asynchrone. Pendant l'envoi d'un email, le serveur ne répond plus à personne. Sans configuration SMTP, le lien de réinitialisation est perdu en silence.

**Fait :** délai maximum de 15 s, contenu affiché dans les logs sans SMTP, remerciements aux donateurs envoyés en tâche de fond.
**Reste à faire :** envoyer aussi en tâche de fond l'email de mot de passe oublié et l'email de bienvenue des admins (encore envoyés pendant la requête).

### 13. Les listes s'arrêtent à 50 éléments
Les listes admin (posts, dossiers) et le sélecteur d'antennes récupèrent seulement la première page de 50 éléments, sans pagination à l'écran ([useAdminPosts.ts](frontend/src/hooks/useAdminPosts.ts), [useAdminSubmissions.ts](frontend/src/hooks/useAdminSubmissions.ts), [useBranches.ts](frontend/src/hooks/useBranches.ts)). Au-delà, les éléments disparaissent sans message.

### 14. Dossiers entrepreneurs
L'ajout et la suppression sont faits. Il manque encore :
- un **statut** (reçu, en cours d'étude, accepté, refusé) et des notes internes ;
- un accusé de réception envoyé par email au porteur de projet ;
- une protection anti-spam (captcha ou champ piège invisible) sur le formulaire public.

### 15. La traduction est incomplète
Environ 22 fichiers d'interface sur 139 utilisent la traduction (i18next). L'espace admin est entièrement écrit en dur en français : le passage à l'anglais ne concerne qu'une partie du site.

### 16. Posts
Il n'y a ni recherche, ni filtre par pilier ou par statut dans l'admin, ni aperçu avant publication.

---

## 🟡 Priorité 3 — Qualité, maintenance et déploiement

### 17. ~~Il n'y a aucun test~~ — ✅ traité
39 tests dans `backend/tests/` (pytest), sur une base PostgreSQL dédiée recréée par les migrations Alembic : authentification (connexion, jetons, changement de mot de passe), permissions (un admin n'agit que sur son antenne, actions réservées au super admin), dons (carte dans les trois devises, montants invalides, carte refusée, Mobile Money, référence en double, validation et rejet par le bon admin) et statut des antennes.

**Reste à faire :** tests du frontend, et tests des routes non couvertes (upload, notifications, paramètres, réinitialisation du mot de passe).

### 18. ~~Il n'y a ni CI, ni procédure de déploiement~~ — ✅ traité
- `backend/Dockerfile`, `frontend/Dockerfile` (nginx) et `docker-compose.prod.yml` (voir la section *Déploiement* du README) ;
- GitHub Actions (`.github/workflows/ci.yml`) à chaque push et pull request : lint (ruff) et tests du backend, lint (oxlint) et build du frontend, construction des deux images ;
- `ruff` configuré (`backend/ruff.toml`) ; les 20 imports inutilisés et deux erreurs signalées ont été corrigés ;
- `requirements-dev.txt` remplacé : c'était une copie d'un autre environnement, incompatible avec `requirements.txt`.

**Reste à faire :** publier les images (registre) et automatiser la mise en ligne, une fois l'hébergement choisi ; HTTPS devant nginx.

### 19. ~~Du code mort à supprimer~~ — ✅ traité
Supprimés : `auth_legacy.py`, `oauth.py` et `oauth_google.py`, `ws.py`, `cities.py`, `search/elasticsearch.py`, `utils/sanitize.py`, le `SessionMiddleware` (et la dépendance `itsdangerous`, qui ne servait qu'à lui). Aussi supprimés, car morts eux aussi : `endpoints/search.py` (cassé, il importait des modèles supprimés), `core/rate_limit.py` (doublon inutilisé du middleware), le modèle et les schémas `city` et `search` (sans table en base).

### 20. ~~Des fichiers qui n'ont rien à faire dans git~~ — ✅ traité
`backend/dev.db` et les images de `backend/uploads/` (utilisées nulle part) ne sont plus suivis par git et sont ignorés ; le dossier vide `Platform-CEM/Platform-CEM/` est supprimé. `backend/package-lock.json` n'existait déjà plus.

### 21. ~~Des syntaxes obsolètes~~ — ✅ traité
Syntaxe Pydantic v2 partout (16 fichiers) : `.model_dump()`, `.model_validate()`, `model_config = ConfigDict(...)` ; `@app.on_event` remplacé par un `lifespan` dans [main.py](backend/app/main.py). Les tests passent sans aucun avertissement (60 auparavant), et `pytest.ini` ne masque plus les avertissements de dépréciation, pour repérer les suivants tout de suite.

### 22. ~~Redis est toujours sollicité~~ — ✅ traité
Le backend ne se connecte à Redis que si `USE_REDIS=true`, à l'adresse `REDIS_URL` (auparavant toujours `localhost`). Le message `Redis connection failed` a disparu du démarrage.

### 23. ~~Les réponses d'erreur ne sont pas cohérentes~~ — ✅ traité
- Tous les messages d'erreur du backend sont en français (14 messages anglais traduits, 27 occurrences), avec un vocabulaire commun : « Antenne introuvable », « Accès réservé au super admin »…
- Réponses typées (schémas Pydantic, visibles dans la documentation `/docs`) pour `/super-admin/admins` (liste et création), `/super-admin/statistics`, `/super-admin/audit/stats`, `/notifications/unread-count`, `/auth/password/change` et `/auth/password/reset`.
- `/super-admin/statistics` renvoie `generated_at`, une vraie date, à la place de `"timestamp": "now"`.
- 6 tests ajoutés (45 au total), dont un qui vérifie les messages en français.

**Reste à faire :** les messages de validation détaillés (erreurs 422, champ par champ) sont produits par Pydantic et restent en anglais (« Field required ») ; les anciennes routes `publications` ne sont pas typées.

---

## Ordre conseillé

1. **Tout de suite :** points 3, 4 et 20 — rapide, et ça supprime les plus gros risques.
2. **Ensuite :** points 2, 5, 6, 7, 8, 9 et 17 — la sécurité de fond, et les tests serviront de filet pour la suite.
3. **Puis :** les fonctionnalités (10 à 16), le déploiement (18) et le nettoyage (19, 21 à 23).

---

## Déjà fait sur la branche `docs/setup-local`

- README réécrit (installation Linux/Windows, Python 3.12, vrais comptes de démo, dépannage).
- `backend/.env.example` créé.
- `requirements.txt` : `bcrypt==4.0.1` figé, `itsdangerous` ajouté, doublon `python-multipart` retiré.
- Le super admin peut créer des posts en vue « Toutes les antennes » (choix de l'antenne dans le formulaire).
- Créer un post dans une antenne inexistante renvoie 404 au lieu de 500.
- Dossiers entrepreneurs : ajout manuel et suppression depuis l'admin.
- Dons : carte bancaire (simulée, prête pour un vrai prestataire) et Mobile Money déclaré puis vérifié par un admin (checklist, correction du montant, rejet motivé, saisie manuelle d'un paiement reçu) ; virement supprimé ; email de remerciement à chaque confirmation ; page admin « Coordonnées de paiement ».
- Emails : réglages SMTP enfin lus depuis `.env`, envoi en tâche de fond avec délai maximum, contenu affiché dans les logs quand SMTP n'est pas configuré.
