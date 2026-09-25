import asyncio

from app.core.security import hash_password
from app.db.session import AsyncSessionLocal
from app.models.branch import Branch
from app.models.donation import Donation, DonationStatus, MobileOperator, PaymentMethod
from app.models.post import Post, PostImage, Pillar, PostStatus
from app.models.project_submission import ProjectSubmission
from app.models.publication import Publication, PublicationFormat
from app.models.settings import AssociationSettings
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
            Donation(
                branch_id=branches[1].id, amount=20.0, currency="EUR", donor_email="donateur1@example.com",
                donor_name="Hery Andriamanana", payment_method=PaymentMethod.CARD,
                transaction_reference="sim_pi_demo0001", status=DonationStatus.CONFIRMED,
            ),
            Donation(
                branch_id=None, amount=100.0, currency="EUR", donor_email="donateur2@example.com",
                payment_method=PaymentMethod.CARD, transaction_reference="sim_pi_demo0002",
                status=DonationStatus.CONFIRMED,
            ),
            Donation(
                branch_id=branches[0].id, amount=50000.0, declared_amount=50000.0, currency="MGA",
                donor_email="donateur3@example.mg", donor_name="Lova Rakoto", donor_phone="0340000001",
                payment_method=PaymentMethod.MOBILE_MONEY, mobile_operator=MobileOperator.MVOLA.value,
                transaction_reference="DEMO123456789", status=DonationStatus.PENDING,
            ),
            Donation(
                branch_id=branches[0].id, amount=20000.0, declared_amount=20000.0, currency="MGA",
                donor_email="donateur4@example.mg", donor_phone="0320000002",
                payment_method=PaymentMethod.MOBILE_MONEY, mobile_operator=MobileOperator.ORANGE_MONEY.value,
                transaction_reference="PP260925.DEMO.A1", status=DonationStatus.CONFIRMED,
            ),
            Donation(
                branch_id=branches[1].id, amount=10000.0, declared_amount=10000.0, currency="MGA",
                donor_email="donateur5@example.mg", donor_phone="0340000003",
                payment_method=PaymentMethod.MOBILE_MONEY, mobile_operator=MobileOperator.MVOLA.value,
                transaction_reference="DEMO987654321", status=DonationStatus.REJECTED,
                rejection_reason="Référence introuvable dans l'historique MVola",
            ),
        ]
        db.add_all(donations)

        # Numéros FICTIFS pour la démo : à remplacer dans l'admin (Coordonnées de paiement)
        settings = await db.get(AssociationSettings, 1) or AssociationSettings(id=1)
        settings.mobile_money_holder = "CLUB EXCELLENCE MADAGASCAR (DÉMO)"
        settings.mvola_number = "034 00 000 00"
        settings.orange_money_number = "032 00 000 00"
        settings.airtel_money_number = "033 00 000 00"
        db.add(settings)

        await db.commit()
        print("Seed terminé avec succès.")


if __name__ == "__main__":
    asyncio.run(seed())
