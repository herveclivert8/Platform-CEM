"""
Logging et Monitoring - Production setup
Structuré pour ELK stack, Sentry, etc.
"""

import logging
import sys
from datetime import datetime
from typing import Optional
import json


class StructuredLogger:
    """Logger structuré pour production"""

    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
        self.setup_handlers()

    def setup_handlers(self):
        """Configurer les handlers de logging"""
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )

        # Console handler
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)

        # File handler (production)
        try:
            file_handler = logging.FileHandler('logs/app.log')
            file_handler.setFormatter(formatter)
            self.logger.addHandler(file_handler)
        except OSError:
            pass  # Logs directory might not exist

    def log_auth_event(
        self,
        event_type: str,
        user_id: Optional[int] = None,
        email: Optional[str] = None,
        success: bool = True,
        details: Optional[dict] = None,
    ):
        """
        Logger un événement d'authentification
        
        Args:
            event_type: "login", "logout", "refresh", "failed_login"
            user_id: ID utilisateur
            email: Email utilisateur
            success: Succès ou échec
            details: Détails supplémentaires
        """
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": event_type,
            "user_id": user_id,
            "email": email,
            "success": success,
            "details": details or {},
        }

        level = logging.INFO if success else logging.WARNING
        self.logger.log(level, json.dumps(log_data))

    def log_api_call(
        self,
        method: str,
        path: str,
        status_code: int,
        user_id: Optional[int] = None,
        duration_ms: float = 0,
    ):
        """Logger un appel API"""
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "method": method,
            "path": path,
            "status_code": status_code,
            "user_id": user_id,
            "duration_ms": duration_ms,
        }

        level = logging.INFO if 200 <= status_code < 400 else logging.WARNING
        self.logger.log(level, json.dumps(log_data))

    def log_error(
        self,
        error_type: str,
        message: str,
        user_id: Optional[int] = None,
        context: Optional[dict] = None,
    ):
        """Logger une erreur"""
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "error_type": error_type,
            "message": message,
            "user_id": user_id,
            "context": context or {},
        }

        self.logger.error(json.dumps(log_data))


# Instances logger
auth_logger = StructuredLogger("app.auth")
api_logger = StructuredLogger("app.api")
error_logger = StructuredLogger("app.error")


def setup_logging():
    """Setup logging for the application"""
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.StreamHandler(sys.stdout),
        ]
    )
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)


# Middleware pour logging des requêtes (à intégrer dans FastAPI)
class LoggingMiddleware:
    """Middleware pour logger toutes les requêtes API"""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        import time

        start_time = time.time()
        path = scope.get("path")
        method = scope.get("method")

        async def send_wrapper(message):
            if message["type"] == "http.response.start":
                status_code = message["status"]
                duration = (time.time() - start_time) * 1000

                api_logger.log_api_call(
                    method=method,
                    path=path,
                    status_code=status_code,
                    duration_ms=duration,
                )

            await send(message)

        await self.app(scope, receive, send_wrapper)
