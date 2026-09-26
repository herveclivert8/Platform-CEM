import asyncio
from datetime import date, datetime, timezone

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.branch import Branch
from app.models.donation import Donation
from app.models.post import Post, PostImage, Pillar, PostStatus
from app.models.project import Project, ProjectImage, ProjectPhase, ProjectReviewStatus
from app.models.project_submission import ProjectSubmission
from app.models.publication import Publication, PublicationFormat
from app.models.user import User, UserRole


async def seed() -> None:
    async with AsyncSessionLocal() as db:
        branches = [
            Branch(
                name="Antananarivo",
                country="Madagascar",
                continent="Africa",
                latitude=-18.8792,
                longitude=47.5079,
                description="Antenne historique du CEM, siège des opérations à Madagascar.",
            ),
            Branch(
                name="Fianarantsoa",
                country="Madagascar",
                continent="Africa",
                latitude=-21.4529,
                longitude=47.0857,
                description="Antenne des hauts plateaux, forte activité d'aide sociale et d'insertion par le sport.",
            ),
            Branch(
                name="Paris",
                country="France",
                continent="Europe",
                latitude=48.8494,
                longitude=2.3078,
                physical_address="31 Avenue de Ségur, 75007 Paris",
                description="Antenne diaspora, siège des collectes de livres et coordination avec Madagascar.",
            ),
            Branch(
                name="Lyon",
                country="France",
                continent="Europe",
                latitude=45.7640,
                longitude=4.8357,
                description="Antenne diaspora, réseau de partenariats et soutien à l'entrepreneuriat malgache.",
            ),
        ]
        db.add_all(branches)
        await db.flush()

        super_admin = User(
            email="super.admin@cem-madagascar.org",
            hashed_password=hash_password("SuperAdmin123!"),
            first_name="Paris",
            last_name="Siège",
            role=UserRole.SUPER_ADMIN,
        )
        db.add(super_admin)

        branch_admins = [
            User(
                email="antananarivo@cem-madagascar.org",
                hashed_password=hash_password("BranchAdmin123!"),
                first_name="Fanja",
                last_name="Rasoanaivo",
                role=UserRole.BRANCH_ADMIN,
                branch_id=branches[0].id,
            ),
            User(
                email="fianarantsoa@cem-madagascar.org",
                hashed_password=hash_password("BranchAdmin123!"),
                first_name="Njaka",
                last_name="Rakotoson",
                role=UserRole.BRANCH_ADMIN,
                branch_id=branches[1].id,
            ),
            User(
                email="paris@cem-madagascar.org",
                hashed_password=hash_password("BranchAdmin123!"),
                first_name="Camille",
                last_name="Lefèvre",
                role=UserRole.BRANCH_ADMIN,
                branch_id=branches[2].id,
            ),
            User(
                email="lyon@cem-madagascar.org",
                hashed_password=hash_password("BranchAdmin123!"),
                first_name="Thomas",
                last_name="Girard",
                role=UserRole.BRANCH_ADMIN,
                branch_id=branches[3].id,
            ),
        ]
        db.add_all(branch_admins)
        await db.flush()

        for branch, admin in zip(branches, branch_admins):
            branch.manager_id = admin.id
        await db.flush()

        posts = [
            Post(
                branch_id=branches[0].id,
                author_id=branch_admins[0].id,
                title="Plus de 10 000 livres distribués !",
                content="Grâce aux collectes organisées à Paris, notre antenne a franchi le cap des 10 000 ouvrages scolaires distribués dans les écoles locales.",
                pillar=Pillar.EDUCATION,
                status=PostStatus.PUBLISHED,
                images=[PostImage(url="https://images.unsplash.com/photo-1509266272358-7701da638078?w=800", position=0)],
            ),
            Post(
                branch_id=branches[0].id,
                author_id=branch_admins[0].id,
                title="Bilan de la campagne de rentrée scolaire",
                content="Brouillon en cours de rédaction sur la campagne de rentrée 2026.",
                pillar=Pillar.EDUCATION,
                status=PostStatus.DRAFT,
            ),
            Post(
                branch_id=branches[1].id,
                author_id=branch_admins[1].id,
                title="Soutien à 40 familles précarisées ce trimestre",
                content="L'antenne de Fianarantsoa a distribué des kits alimentaires et sanitaires à 40 familles identifiées avec les partenaires locaux.",
                pillar=Pillar.SOCIAL,
                status=PostStatus.PUBLISHED,
            ),
            Post(
                branch_id=branches[1].id,
                author_id=branch_admins[1].id,
                title="Tournoi de football inter-quartiers",
                content="Un tournoi réunissant 8 équipes de jeunes a permis de renforcer la cohésion et l'insertion sociale par le sport.",
                pillar=Pillar.SPORT,
                status=PostStatus.PUBLISHED,
                images=[
                    PostImage(url="https://images.unsplash.com/photo-1517649763962-0c623066013b?w=800", position=0),
                ],
            ),
            Post(
                branch_id=branches[2].id,
                author_id=branch_admins[2].id,
                title="Nouvelle collecte de livres à Paris (75007)",
                content="L'antenne de Paris organise une nouvelle collecte d'ouvrages scolaires, à déposer directement au siège avant leur envoi à Madagascar.",
                pillar=Pillar.EDUCATION,
                status=PostStatus.PUBLISHED,
            ),
            Post(
                branch_id=branches[3].id,
                author_id=branch_admins[3].id,
                title="Nouvel appel à projets pour artisans locaux",
                content="Le CEM Lyon lance un appel à projets destiné aux artisans et coopératives malgaches souhaitant développer leur activité à l'export.",
                pillar=Pillar.ENTERPRISE,
                status=PostStatus.PUBLISHED,
            ),
        ]
        db.add_all(posts)

        publications = [
            Publication(
                branch_id=branches[0].id,
                title="Bilan d'Action Annuel 2025 - Antananarivo",
                title_en="2025 Annual Action Report - Antananarivo",
                description="Bilan complet des actions menées par l'antenne d'Antananarivo en 2025.",
                format=PublicationFormat.RAPPORT,
                contributors=[branch_admins[0]],
            ),
            Publication(
                branch_id=branches[1].id,
                title="Bilan d'Action Annuel 2025 - Fianarantsoa",
                title_en="2025 Annual Action Report - Fianarantsoa",
                description="Bilan complet des actions menées par l'antenne de Fianarantsoa en 2025.",
                format=PublicationFormat.RAPPORT,
                contributors=[branch_admins[1]],
            ),
        ]
        db.add_all(publications)

        submissions = [
            ProjectSubmission(
                branch_id=branches[3].id,
                applicant_name="Rivo Rakotondrabe",
                email="rivo.artisanat@example.mg",
                project_summary="Coopérative de vannerie souhaitant un accompagnement pour l'export vers la France.",
            ),
            ProjectSubmission(
                branch_id=branches[0].id,
                applicant_name="Nirina Randria",
                email="nirina.entreprendre@example.mg",
                project_summary="Projet de micro-crédit pour jeunes entrepreneurs du quartier d'Analakely.",
            ),
        ]
        db.add_all(submissions)

        donations = [
            Donation(branch_id=branches[1].id, amount=20.0, donor_email="donateur1@example.com"),
            Donation(branch_id=branches[2].id, amount=50.0, donor_email="donateur3@example.com"),
            Donation(branch_id=None, amount=100.0, donor_email="donateur2@example.com"),
        ]
        db.add_all(donations)

        db.add_all(build_projects(branches, super_admin, branch_admins))

        await db.commit()
        print("Seed terminé avec succès.")


def build_projects(branches: list[Branch], super_admin: User, branch_admins: list[User]) -> list[Project]:
    """Réalisations et projets en cours de démonstration, dans les 3 statuts de validation."""
    now = datetime.now(timezone.utc)

    def approved(**kwargs) -> Project:
        return Project(review_status=ProjectReviewStatus.APPROVED, reviewed_by_id=super_admin.id, reviewed_at=now, **kwargs)

    return [
        approved(
            branch_id=branches[0].id,
            author_id=branch_admins[0].id,
            title="Bibliothèque de l'EPP Ambohipo",
            summary="Équipement complet d'une bibliothèque scolaire : rayonnages, 2 500 ouvrages et formation d'un bibliothécaire.",
            description="<p>Grâce aux collectes organisées à Paris, l'école primaire publique d'Ambohipo dispose désormais d'une bibliothèque de <strong>2 500 ouvrages</strong>.</p><p>Un enseignant a été formé à la gestion du prêt.</p>",
            pillar=Pillar.EDUCATION,
            phase=ProjectPhase.COMPLETED,
            beneficiaries="Élèves de l'EPP Ambohipo",
            beneficiaries_count=640,
            location="Ambohipo, Antananarivo",
            start_date=date(2025, 9, 1),
            end_date=date(2026, 3, 15),
            images=[ProjectImage(url="https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=1200", position=0)],
        ),
        approved(
            branch_id=branches[1].id,
            author_id=branch_admins[1].id,
            title="Tournoi inter-quartiers de football",
            summary="Un tournoi de 3 mois pour remobiliser les jeunes déscolarisés autour du sport et de l'accompagnement scolaire.",
            description="<p>16 équipes, un arbitrage assuré par des jeunes formés et un soutien scolaire hebdomadaire pour les participants.</p>",
            pillar=Pillar.SPORT,
            phase=ProjectPhase.COMPLETED,
            beneficiaries="Jeunes de 12 à 18 ans",
            beneficiaries_count=210,
            location="Fianarantsoa",
            start_date=date(2025, 6, 1),
            end_date=date(2025, 8, 31),
            images=[ProjectImage(url="https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=1200", position=0)],
        ),
        approved(
            branch_id=branches[2].id,
            author_id=super_admin.id,
            title="Collecte de livres « Rentrée 2026 »",
            summary="Collecte de manuels scolaires au siège parisien pour 12 écoles partenaires à Madagascar.",
            description="<p>Dépôt possible au 31 avenue de Ségur (Paris 7e). Objectif : <strong>8 000 livres</strong> avant l'envoi du conteneur.</p>",
            pillar=Pillar.EDUCATION,
            phase=ProjectPhase.ONGOING,
            beneficiaries="12 écoles partenaires",
            beneficiaries_count=12,
            location="Paris 7e",
            start_date=date(2026, 6, 1),
        ),
        approved(
            branch_id=branches[3].id,
            author_id=branch_admins[3].id,
            title="Accompagnement de la coopérative de vannerie",
            summary="Formation à l'export et mise en relation avec des boutiques lyonnaises pour une coopérative de 25 artisanes.",
            description="<p>Ateliers mensuels en visio et premières commandes test prévues pour la fin d'année.</p>",
            pillar=Pillar.ENTERPRISE,
            phase=ProjectPhase.ONGOING,
            beneficiaries="Coopérative de vannerie d'Ambositra",
            beneficiaries_count=25,
            location="Ambositra / Lyon",
            start_date=date(2026, 2, 1),
        ),
        Project(
            branch_id=branches[0].id,
            author_id=branch_admins[0].id,
            title="Kits d'hygiène pour familles vulnérables",
            summary="Distribution de 300 kits d'hygiène aux familles suivies par l'antenne.",
            description="<p>Kits composés de savon, dentifrice, serviettes et produits d'entretien.</p>",
            pillar=Pillar.SOCIAL,
            phase=ProjectPhase.ONGOING,
            beneficiaries="Familles du quartier d'Isotry",
            beneficiaries_count=300,
            location="Isotry, Antananarivo",
            start_date=date(2026, 9, 1),
            review_status=ProjectReviewStatus.PENDING,
        ),
        Project(
            branch_id=branches[1].id,
            author_id=branch_admins[1].id,
            title="Atelier couture solidaire",
            summary="Formation de 10 mères de famille à la couture.",
            description="<p>Dossier incomplet.</p>",
            pillar=Pillar.ENTERPRISE,
            phase=ProjectPhase.COMPLETED,
            beneficiaries="Mères de famille",
            beneficiaries_count=10,
            location="Fianarantsoa",
            end_date=date(2026, 7, 1),
            review_status=ProjectReviewStatus.REJECTED,
            rejection_reason="Merci d'ajouter des photos de l'atelier et les dates exactes de la formation.",
            reviewed_by_id=super_admin.id,
            reviewed_at=now,
        ),
    ]


if __name__ == "__main__":
    asyncio.run(seed())
