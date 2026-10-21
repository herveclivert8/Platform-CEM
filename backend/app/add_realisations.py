"""
Ajouter les réalisations historiques du CEM (contenu officiel) à une base existante, une seule fois.

    python -m app.add_realisations                      # rattachées à l'antenne d'Antananarivo
    python -m app.add_realisations --branch "Paris"     # ou à une autre antenne

Une réalisation peut indiquer sa propre antenne (« branch ») et des photos livrées avec le code
(app/realisations_assets/, envoyées au stockage du site à l'ajout).
Sans effet sur une réalisation déjà présente (même titre). Publiées et visibles aussitôt ; la
traduction anglaise se fait au prochain démarrage du backend (si la traduction automatique est active).
Sur Render : onglet « Shell » du service backend.
"""

import argparse
import asyncio
import sys
import uuid
from datetime import date, datetime, timezone
from pathlib import Path

from sqlalchemy import func, select

import app.models  # noqa: F401 - enregistre tous les modèles
from app.core.storage import get_storage_backend
from app.db.session import AsyncSessionLocal
from app.models import Branch, Project, ProjectImage, UploadedFile
from app.models.post import Pillar
from app.models.project import ProjectPhase, ProjectReviewStatus

CONCOURS_2022 = {
    "title": "Concours Général de Mathématiques 2022",
    "summary": (
        "Première édition du Concours Général à Madagascar, organisée le 4 novembre 2022 avec le Ministère "
        "de l'Éducation Nationale pour distinguer et accompagner les meilleurs lycéens en mathématiques."
    ),
    "pillar": Pillar.EDUCATION,
    "beneficiaries": "Lycéens de terminale S et C de tout Madagascar",
    "location": "7 centres régionaux à Madagascar",
    "start_date": date(2022, 6, 1),
    "end_date": date(2022, 12, 21),
    "description": """
<p>Inspiré du Concours Général des lycées et des métiers créé en France en 1744, le <strong>Concours Général de
Mathématiques</strong> a distingué en 2022 les meilleurs élèves de terminale scientifique de Madagascar, afin de
valoriser leurs compétences et de promouvoir la culture de l'excellence malagasy.</p>

<p>Il a été organisé dans le cadre de la <strong>convention de partenariat n° 2022-003 MEN du 21 mars 2022</strong>
entre le Ministère de l'Éducation Nationale et le Club Excellence Madagascar : le Ministère a porté le concours
(communication officielle, centres, acheminement des sujets) et le CEM en a assuré l'appui pédagogique — conception
des sujets d'entraînement et du sujet du concours, correction et classement — ainsi que la recherche de financements.</p>

<h3>Pourquoi ce concours</h3>
<p>Les évaluations menées depuis plusieurs années montrent une baisse des compétences des élèves dans les
disciplines de base, en particulier en mathématiques. Le concours veut redonner le goût des sciences, faire
émerger les talents et mieux connaître les points forts et les fragilités des élèves pour améliorer
l'enseignement.</p>

<h3>Une épreuve exigeante et équitable</h3>
<ul>
<li>Ouvert aux lycéens de nationalité malgache inscrits en terminale S ou C, présentés par leur établissement
(au plus 10 % des meilleurs élèves en mathématiques) ; inscription gratuite.</li>
<li>Une épreuve de 5 heures, sans calculatrice : quatre exercices couvrant l'analyse, l'algèbre, la géométrie et
les probabilités, sur les programmes du collège à la première.</li>
<li>Sept centres d'épreuve : Antananarivo (Lycée de Nanisana), Toliara (Lycée Laurent Botokeky), Toamasina
(Lycée Jacques Rabemananjara), Mahajanga (Lycée Philibert Tsiranana), Antsiranana (Lycée Mixte),
Fianarantsoa (Lycée Raherivelo Ramamonjy) et Antsirabe (Lycée André Resampa).</li>
<li>Des copies anonymes, scannées puis corrigées par des professeurs de mathématiques, dont une partie depuis
la France, selon une grille commune.</li>
</ul>

<h3>Récompenser et accompagner</h3>
<p>Le concours récompense les meilleurs candidats ainsi que leurs professeurs de mathématiques et leurs
établissements d'origine. Au-delà des prix, il prévoit un programme de suivi des lauréats et la recherche de
bourses pour leurs études après le baccalauréat. Le concours a vocation à s'ouvrir à d'autres disciplines.</p>
""".strip(),
}

# Année de la collecte à compléter (start_date / end_date) dès qu'elle sera connue
LIVRES_SCOLAIRES = {
    "title": "Collecte et envoi de livres scolaires",
    "summary": (
        "Des livres scolaires collectés en France et distribués à Madagascar par l'intermédiaire du Ministère "
        "de l'Éducation Nationale : 10 000 élèves touchés."
    ),
    "pillar": Pillar.EDUCATION,
    "beneficiaries": "Élèves des écoles de Madagascar",
    "beneficiaries_count": 10000,
    "location": "Collecte en France, distribution à Madagascar",
    "description": """
<p>Faciliter l'accès des élèves aux ressources pédagogiques est l'une des priorités du Club Excellence
Madagascar. Ses membres bénévoles ont organisé en France une <strong>collecte de livres scolaires</strong>, puis leur
envoi à Madagascar.</p>

<p>Les ouvrages ont été distribués aux écoles par l'intermédiaire du <strong>Ministère de l'Éducation
Nationale</strong>. Au total, <strong>10 000 élèves</strong> ont bénéficié de cette action.</p>

<p>Ce projet a fait connaître le CEM dans le domaine de l'éducation et a ouvert la voie au partenariat avec le
Ministère, dans le cadre duquel a notamment été organisé le premier Concours Général de Mathématiques à
Madagascar, en 2022.</p>
""".strip(),
}

CONFERENCE_2023 = {
    "title": "Conférence-débat « Que peut-on espérer de la coopération Madagascar-France ? »",
    "summary": (
        "Le 22 avril 2023 à la Mairie du 11e arrondissement de Paris, une conférence-débat pour mieux faire "
        "connaître Madagascar et ouvrir le dialogue sur les liens entre les deux pays."
    ),
    "pillar": Pillar.SOCIAL,
    "beneficiaries": "Public parisien, diaspora malagasy et amis de Madagascar",
    "location": "Mairie du 11e arrondissement, Paris",
    "start_date": date(2023, 4, 22),
    "end_date": date(2023, 4, 22),
    "branch": "Paris",
    "photos": [
        "conference-2023-salle.jpg",
        "conference-2023-public.jpg",
        "conference-2023-debat.jpg",
        "conference-2023-intervenants.jpg",
    ],
    "description": """
<p>Le samedi 22 avril 2023, le Club Excellence Madagascar, le <strong>Souvenir Français</strong> (section Paris 19e)
et l'<strong>Association Internationale des Musiciens de la Rue</strong> ont organisé une conférence-débat dans la
salle des fêtes de la Mairie du 11e arrondissement de Paris, autour de la question : « Quelles sont les
opportunités pour Madagascar et la France à travers leur histoire commune ? »</p>

<h3>Faire connaître Madagascar autrement</h3>
<p>Les trois associations portent des projets autour de l'histoire partagée des deux pays. Elles souhaitaient
présenter Madagascar au-delà des images de paysages et de ressources naturelles, en parlant de la vie quotidienne
de sa population et de ses besoins de développement.</p>

<h3>Un dialogue ouvert</h3>
<p>Journalistes, chercheurs et professionnels invités ont échangé avec un public nombreux, venu de la diaspora
malagasy comme des amis de Madagascar. Les organisateurs ont voulu laisser une large place à la parole de
chacun, afin de mieux comprendre les attentes des uns et des autres et de dépasser les idées reçues.</p>

<p>Les échanges ont montré un intérêt réel du public pour Madagascar et une volonté de s'engager aux côtés de
sa population dans des projets utiles, notamment dans l'éducation, le numérique ou l'énergie.</p>
""".strip(),
}

REALISATIONS = [CONCOURS_2022, LIVRES_SCOLAIRES, CONFERENCE_2023]
ASSETS_DIR = Path(__file__).parent / "realisations_assets"


async def _upload_photos(db, names: list[str]) -> list[ProjectImage]:
    """Envoyer les photos livrées avec le code vers le stockage du site (local ou cloud)."""
    storage = get_storage_backend()
    images = []
    for position, name in enumerate(names):
        stored = f"{uuid.uuid4()}{Path(name).suffix.lower()}"
        url = await storage.upload(stored, (ASSETS_DIR / name).read_bytes())
        db.add(UploadedFile(filename=stored))
        images.append(ProjectImage(url=url, position=position))
    return images


async def add_realisations(branch_name: str) -> int:
    async with AsyncSessionLocal() as db:
        branch = await db.scalar(select(Branch).where(func.lower(Branch.name) == branch_name.lower()))
        if branch is None:
            names = (await db.execute(select(Branch.name).order_by(Branch.name))).scalars().all()
            sys.exit(f"Antenne « {branch_name} » introuvable. Antennes existantes : {', '.join(names) or 'aucune'}")

        added = 0
        for entry in REALISATIONS:
            data = {k: v for k, v in entry.items() if k not in ("branch", "photos")}
            if await db.scalar(select(Project.id).where(Project.title == data["title"])):
                print(f"Déjà présente, ignorée : {data['title']}")
                continue
            target = branch
            if entry.get("branch"):
                target = await db.scalar(select(Branch).where(func.lower(Branch.name) == entry["branch"].lower())) or branch
            db.add(
                Project(
                    branch_id=target.id,
                    images=await _upload_photos(db, entry.get("photos", [])),
                    phase=ProjectPhase.COMPLETED,
                    review_status=ProjectReviewStatus.APPROVED,
                    reviewed_at=datetime.now(timezone.utc),
                    is_visible=True,
                    **data,
                )
            )
            added += 1
            print(f"Ajoutée : {data['title']} (antenne {target.name})")
        await db.commit()
        return added


def main() -> None:
    parser = argparse.ArgumentParser(description="Ajouter les réalisations historiques du CEM.")
    parser.add_argument("--branch", default="Antananarivo", help="Antenne de rattachement (défaut : Antananarivo)")
    args = parser.parse_args()
    asyncio.run(add_realisations(args.branch))


if __name__ == "__main__":
    main()
