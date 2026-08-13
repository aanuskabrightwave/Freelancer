import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from app.core.config import settings

logger = logging.getLogger("email_service")


class EmailService:
    @staticmethod
    def send_email(to_email: str, subject: str, html_content: str, text_content: str = "") -> bool:
        """
        Sends an email. In development, if SMTP settings are not provided,
        it prints the email contents to the logger/console.
        """
        # Determine if SMTP configuration is fully provided
        use_smtp = all([
            settings.SMTP_HOST,
            settings.SMTP_PORT,
            settings.SMTP_USERNAME,
            settings.SMTP_PASSWORD
        ])

        if not use_smtp:
            logger.info("=" * 60)
            logger.info("[DEV EMAIL SERVICE] SMTP credentials not configured.")
            logger.info(f"[DEV EMAIL SERVICE] Sending email to: {to_email}")
            logger.info(f"[DEV EMAIL SERVICE] Subject: {subject}")
            logger.info(f"[DEV EMAIL SERVICE] HTML Content:\n{html_content}")
            logger.info("=" * 60)
            return True

        # Send via SMTP
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.MAIL_FROM
            msg["To"] = to_email

            if text_content:
                msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            # Connect to SMTP Server
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.starttls()
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(settings.MAIL_FROM, to_email, msg.as_string())
            
            logger.info(f"Email successfully sent to {to_email}")
            return True
        except Exception as e:
            logger.error(f"Failed to send email to {to_email} via SMTP: {str(e)}")
            return False

    @classmethod
    def send_password_reset(cls, to_email: str, token: str) -> bool:
        """
        Send a password reset link.
        """
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={token}"
        subject = f"Reset Password - {settings.APP_NAME}"
        
        html_content = f"""
        <html>
            <body>
                <h2>Password Reset Request</h2>
                <p>We received a request to reset the password for your account on {settings.APP_NAME}.</p>
                <p>Click the link below to set a new password. This link is valid for 30 minutes.</p>
                <p><a href="{reset_url}" target="_blank">{reset_url}</a></p>
                <p>If you did not request this, please ignore this email.</p>
            </body>
        </html>
        """
        text_content = f"Reset your password by visiting this link: {reset_url}"
        
        return cls.send_email(to_email, subject, html_content, text_content)

    @classmethod
    def send_email_verification(cls, to_email: str, token: str) -> bool:
        """
        Send an email verification link.
        """
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={token}"
        subject = f"Verify Email - {settings.APP_NAME}"
        
        html_content = f"""
        <html>
            <body>
                <h2>Email Verification Request</h2>
                <p>Thank you for registering on {settings.APP_NAME}.</p>
                <p>Click the link below to verify your email address. This link is valid for 30 minutes.</p>
                <p><a href="{verify_url}" target="_blank">{verify_url}</a></p>
                <p>If you did not create this account, please ignore this email.</p>
            </body>
        </html>
        """
        text_content = f"Verify your email address by visiting this link: {verify_url}"
        
        return cls.send_email(to_email, subject, html_content, text_content)
