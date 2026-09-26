"""
Journal d'audit : qui a fait quoi, sur quelle ressource, depuis quelle adresse.

`record_audit` ajoute l'entrée à la session SANS commit : elle est enregistrée dans la même
transaction que l'opération tracée (pas d'entrée pour une opération annulée, ni l'inverse).
L'IP et le navigateur de la requête en cours sont fournis par `AuditContextMiddleware`.
"""

from contextvars import ContextVar
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit import AuditLog
from app.models.user import User

_client_ip: ContextVar[str | None] = ContextVar("audit_client_ip", default=None)
_user_agent: ContextVar[str | None] = ContextVar("audit_user_agent", default=None)


class AuditContextMiddleware:
    """Middleware ASGI : mémorise l'IP (déjà corrigée par Uvicorn derrière un proxy) et le User-Agent."""

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        if scope["type"] == "http":
            client = scope.get("client")
            headers = dict(scope.get("headers") or [])
            ip_token = _client_ip.set(client[0] if client else None)
            ua_token = _user_agent.set((headers.get(b"user-agent") or b"").decode("latin-1")[:500] or None)
            try:
                await self.app(scope, receive, send)
            finally:
                _client_ip.reset(ip_token)
                _user_agent.reset(ua_token)
        else:
            await self.app(scope, receive, send)


def record_audit(
    db: AsyncSession,
    *,
    action: str,
    resource_type: str,
    user: User | None = None,
    user_email: str | None = None,
    resource_id: int | None = None,
    branch_id: int | None = None,
    details: dict[str, Any] | None = None,
    success: bool = True,
    error_message: str | None = None,
) -> None:
    """
    action : "create", "update", "delete", "login", "logout", "password_change", "password_reset",
             "confirm", "reject", "reopen".
    resource_type : "post", "publication", "branch", "user", "submission", "donation", "settings", "file".
    """
    db.add(
        AuditLog(
            user_id=user.id if user else None,
            user_email=user.email if user else user_email,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            branch_id=branch_id,
            details=details,
            ip_address=_client_ip.get(),
            user_agent=_user_agent.get(),
            success=1 if success else 0,
            error_message=error_message,
        )
    )
