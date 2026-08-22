"""
Service Email - Notifications et communications
Production-ready avec templates
"""

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import smtplib
from typing import List, Optional
from datetime import datetime
import os
from jinja2 import Template


class EmailService:
    """Service d'envoi d'emails"""

    def __init__(
        self,
        smtp_host: str = os.getenv("SMTP_HOST", "smtp.gmail.com"),
        smtp_port: int = int(os.getenv("SMTP_PORT", "587")),
        smtp_user: str = os.getenv("SMTP_USER", ""),
        smtp_password: str = os.getenv("SMTP_PASSWORD", ""),
        from_email: str = os.getenv("FROM_EMAIL", "noreply@cem.mg"),
    ):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.from_email = from_email

    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
    ) -> bool:
        """
        Envoyer un email
        
        Args:
            to_email: Adresse destinataire
            subject: Sujet
            html_content: Contenu HTML
            text_content: Contenu texte (fallback)
        
        Returns:
            True si succès, False sinon
        """
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = self.from_email
            msg["To"] = to_email

            if text_content:
                part1 = MIMEText(text_content, "plain")
                msg.attach(part1)

            part2 = MIMEText(html_content, "html")
            msg.attach(part2)

            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            return True
        except Exception as e:
            print(f"Email error: {e}")
            return False

    def send_welcome_email(self, user_email: str, user_name: str) -> bool:
        """Envoyer email de bienvenue"""
        template = """
        <html>
            <body>
                <h1>Bienvenue sur CEM Platform, {{ user_name }}!</h1>
                <p>Votre compte administrateur a été créé avec succès.</p>
                <p>Email: {{ user_email }}</p>
                <p>Vous pouvez maintenant vous connecter à: <a href="https://app.cem.mg/login">CEM Platform</a></p>
                <p>Cordialement,<br>L'équipe CEM</p>
            </body>
        </html>
        """
        
        html = Template(template).render(user_email=user_email, user_name=user_name)
        return self.send_email(
            to_email=user_email,
            subject=f"Bienvenue sur CEM Platform, {user_name}",
            html_content=html,
        )

    def send_publication_notification(
        self,
        admin_email: str,
        publication_title: str,
        branch_name: str,
    ) -> bool:
        """Notifier un admin d'une nouvelle publication"""
        template = """
        <html>
            <body>
                <h2>Nouvelle publication créée</h2>
                <p><strong>Titre:</strong> {{ publication_title }}</p>
                <p><strong>Antenne:</strong> {{ branch_name }}</p>
                <p>Consultez votre dashboard pour plus de détails.</p>
                <p>Cordialement,<br>L'équipe CEM</p>
            </body>
        </html>
        """
        
        html = Template(template).render(
            publication_title=publication_title,
            branch_name=branch_name,
        )
        return self.send_email(
            to_email=admin_email,
            subject=f"Nouvelle publication: {publication_title}",
            html_content=html,
        )

    def send_password_reset(
        self,
        user_email: str,
        reset_link: str,
    ) -> bool:
        """Envoyer lien de réinitialisation mot de passe"""
        template = """
        <html>
            <body>
                <h2>Réinitialiser votre mot de passe</h2>
                <p>Cliquez sur le lien ci-dessous pour réinitialiser votre mot de passe:</p>
                <p><a href="{{ reset_link }}">Réinitialiser mon mot de passe</a></p>
                <p>Ce lien expire dans 24 heures.</p>
                <p>Si vous n'avez pas demandé de réinitialisation, ignorez cet email.</p>
                <p>Cordialement,<br>L'équipe CEM</p>
            </body>
        </html>
        """
        
        html = Template(template).render(reset_link=reset_link)
        return self.send_email(
            to_email=user_email,
            subject="Réinitialiser votre mot de passe CEM Platform",
            html_content=html,
        )

    def send_admin_alert(
        self,
        admin_email: str,
        alert_type: str,
        message: str,
        details: dict,
    ) -> bool:
        """Envoyer alerte aux admins"""
        template = """
        <html>
            <body>
                <h2>⚠️ Alerte: {{ alert_type }}</h2>
                <p>{{ message }}</p>
                <h3>Détails:</h3>
                <ul>
                {% for key, value in details.items() %}
                    <li><strong>{{ key }}:</strong> {{ value }}</li>
                {% endfor %}
                </ul>
                <p>Connectez-vous au dashboard pour plus d'informations.</p>
            </body>
        </html>
        """
        
        html = Template(template).render(
            alert_type=alert_type,
            message=message,
            details=details,
        )
        return self.send_email(
            to_email=admin_email,
            subject=f"[ALERTE] {alert_type}",
            html_content=html,
        )


# Instance globale
email_service = EmailService()
