"""
Service Email - Notifications et communications
Production-ready avec templates
"""

from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.utils import formataddr
import logging
import smtplib
from typing import Optional
from datetime import datetime
from jinja2 import Template

from app.core.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    """Service d'envoi d'emails"""

    def __init__(
        self,
        smtp_host: str = settings.SMTP_HOST,
        smtp_port: int = settings.SMTP_PORT,
        smtp_user: str = settings.SMTP_USER,
        smtp_password: str = settings.SMTP_PASSWORD,
        from_email: str = settings.FROM_EMAIL,
        from_name: str = settings.FROM_NAME,
    ):
        self.smtp_host = smtp_host
        self.smtp_port = smtp_port
        self.smtp_user = smtp_user
        self.smtp_password = smtp_password
        self.from_email = from_email
        self.from_name = from_name

    @property
    def is_configured(self) -> bool:
        return bool(self.smtp_user and self.smtp_password)

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
        if not self.is_configured:
            # Développement : pas de SMTP, on affiche l'email dans les logs pour pouvoir le relire
            logger.info(
                "[EMAIL NON ENVOYÉ — SMTP non configuré]\nÀ : %s\nSujet : %s\n\n%s",
                to_email,
                subject,
                text_content or html_content,
            )
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = formataddr((self.from_name, self.from_email))
            msg["To"] = to_email

            if text_content:
                part1 = MIMEText(text_content, "plain")
                msg.attach(part1)

            part2 = MIMEText(html_content, "html")
            msg.attach(part2)

            with smtplib.SMTP(self.smtp_host, self.smtp_port, timeout=15) as server:
                server.starttls()
                server.login(self.smtp_user, self.smtp_password)
                server.send_message(msg)

            return True
        except Exception as e:
            logger.error("Échec d'envoi de l'email à %s : %s", to_email, e)
            return False

    def send_welcome_email(self, user_email: str, user_name: str) -> bool:
        """Envoyer email de bienvenue"""
        template = """
        <html>
            <body>
                <h1>Bienvenue sur CEM Platform, {{ user_name }}!</h1>
                <p>Votre compte administrateur a été créé avec succès.</p>
                <p>Email: {{ user_email }}</p>
                <p>Connectez-vous avec le mot de passe temporaire que vous a transmis le Super Admin :
                <a href="{{ login_url }}">CEM Platform</a>. Vous devrez le remplacer par votre propre mot de passe.</p>
                <p>Cordialement,<br>L'équipe CEM</p>
            </body>
        </html>
        """
        
        html = Template(template, autoescape=True).render(
            user_email=user_email, user_name=user_name, login_url=f"{settings.FRONTEND_URL}/login"
        )
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
        
        html = Template(template, autoescape=True).render(
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
                <p>Ce lien expire dans 1 heure.</p>
                <p>Si vous n'avez pas demandé de réinitialisation, ignorez cet email.</p>
                <p>Cordialement,<br>L'équipe CEM</p>
            </body>
        </html>
        """
        
        html = Template(template, autoescape=True).render(reset_link=reset_link)
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
        
        html = Template(template, autoescape=True).render(
            alert_type=alert_type,
            message=message,
            details=details,
        )
        return self.send_email(
            to_email=admin_email,
            subject=f"[ALERTE] {alert_type}",
            html_content=html,
        )

    def send_submission_acknowledgment(
        self,
        applicant_email: str,
        applicant_name: str,
        branch_name: str,
    ) -> bool:
        """Accusé de réception envoyé au porteur de projet après le dépôt de son dossier."""
        context = dict(applicant_name=applicant_name, branch_name=branch_name, site_url=settings.FRONTEND_URL)
        return self.send_email(
            to_email=applicant_email,
            subject="Nous avons bien reçu votre dossier — Club Excellence Madagascar",
            html_content=Template(SUBMISSION_ACK_HTML, autoescape=True).render(**context),
            text_content=Template(SUBMISSION_ACK_TEXT).render(**context),
        )

    def send_donation_thank_you(
        self,
        donor_email: str,
        donor_name: Optional[str],
        amount_label: str,
        payment_label: str,
        branch_name: Optional[str],
        donation_date: datetime,
    ) -> bool:
        """Remercier un donateur une fois son don confirmé (reçu du paiement)."""
        context = dict(
            donor_name=donor_name,
            amount_label=amount_label,
            payment_label=payment_label,
            branch_name=branch_name,
            # Élision : "d'Antananarivo", "de Paris"
            branch_of=(("d'" if branch_name[0].lower() in "aeiouyhéè" else "de ") + branch_name) if branch_name else None,
            donation_date=donation_date.strftime("%d/%m/%Y"),
            site_url=settings.FRONTEND_URL,
        )
        html = Template(DONATION_THANK_YOU_HTML, autoescape=True).render(**context)
        text = Template(DONATION_THANK_YOU_TEXT).render(**context)
        return self.send_email(
            to_email=donor_email,
            subject="Merci pour votre don au Club Excellence Madagascar",
            html_content=html,
            text_content=text,
        )


# Instance globale
email_service = EmailService()


SUBMISSION_ACK_TEXT = """Bonjour {{ applicant_name }},

Nous avons bien reçu votre dossier de projet, transmis à l'antenne {{ branch_name }} du Club Excellence Madagascar.
L'équipe de l'antenne va l'étudier et reviendra vers vous à cette adresse email.

Merci pour votre confiance,
L'équipe du Club Excellence Madagascar
{{ site_url }}
"""

SUBMISSION_ACK_HTML = """<!doctype html>
<html lang="fr">
<body style="margin:0;padding:24px 12px;background:#f1f5f9;font-family:Helvetica,Arial,sans-serif;color:#0f172a;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;">
    <div style="background:#059669;padding:24px 32px;color:#ffffff;">
      <p style="margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Club Excellence Madagascar</p>
      <h1 style="margin:8px 0 0;font-size:22px;">Dossier bien reçu</h1>
    </div>
    <div style="padding:24px 32px;font-size:15px;line-height:1.6;">
      <p>Bonjour {{ applicant_name }},</p>
      <p>Nous avons bien reçu votre dossier de projet, transmis à l'antenne <strong>{{ branch_name }}</strong>.
      L'équipe de l'antenne va l'étudier et reviendra vers vous à cette adresse email.</p>
      <p>Merci pour votre confiance,<br>L'équipe du Club Excellence Madagascar</p>
      <p><a href="{{ site_url }}" style="color:#059669;">{{ site_url }}</a></p>
    </div>
  </div>
</body>
</html>
"""


DONATION_THANK_YOU_TEXT = """Bonjour{% if donor_name %} {{ donor_name }}{% endif %},

Nous avons bien reçu votre don de {{ amount_label }}{% if branch_name %} pour l'antenne {{ branch_of }}{% endif %}.
Merci pour votre générosité : elle permet au Club Excellence Madagascar de poursuivre ses actions
en faveur de l'éducation, de l'entrepreneuriat et de la solidarité.

Récapitulatif
- Montant : {{ amount_label }}
- Moyen de paiement : {{ payment_label }}
- Date : {{ donation_date }}

Avec toute notre reconnaissance,
L'équipe du Club Excellence Madagascar
{{ site_url }}
"""

DONATION_THANK_YOU_HTML = """<!doctype html>
<html lang="fr">
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Helvetica,Arial,sans-serif;color:#0f172a;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;">
        <tr><td style="background:#059669;padding:28px 32px;color:#ffffff;">
          <p style="margin:0;font-size:13px;letter-spacing:.08em;text-transform:uppercase;opacity:.85;">Club Excellence Madagascar</p>
          <h1 style="margin:8px 0 0;font-size:24px;line-height:1.3;">Merci pour votre don&nbsp;!</h1>
        </td></tr>
        <tr><td style="padding:28px 32px;font-size:15px;line-height:1.6;">
          <p style="margin:0 0 16px;">Bonjour{% if donor_name %} {{ donor_name }}{% endif %},</p>
          <p style="margin:0 0 16px;">Nous avons bien reçu votre don de <strong>{{ amount_label }}</strong>{% if branch_name %} pour l'antenne <strong>{{ branch_of }}</strong>{% endif %}.
          Votre générosité permet au Club Excellence Madagascar de poursuivre ses actions en faveur de l'éducation,
          de l'entrepreneuriat et de la solidarité.</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border:1px solid #e2e8f0;border-radius:12px;">
            <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;">Montant</td><td align="right" style="padding:12px 16px;font-weight:bold;">{{ amount_label }}</td></tr>
            <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;">Moyen de paiement</td><td align="right" style="padding:12px 16px;border-top:1px solid #e2e8f0;">{{ payment_label }}</td></tr>
            <tr><td style="padding:12px 16px;color:#64748b;font-size:13px;border-top:1px solid #e2e8f0;">Date</td><td align="right" style="padding:12px 16px;border-top:1px solid #e2e8f0;">{{ donation_date }}</td></tr>
          </table>
          <p style="margin:0;">Avec toute notre reconnaissance,<br><strong>L'équipe du Club Excellence Madagascar</strong></p>
        </td></tr>
        <tr><td style="padding:16px 32px 28px;font-size:12px;color:#94a3b8;">
          <a href="{{ site_url }}" style="color:#059669;text-decoration:none;">{{ site_url }}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>
"""
