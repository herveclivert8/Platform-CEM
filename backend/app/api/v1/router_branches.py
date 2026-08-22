"""
Router agrégateur pour tous les endpoints v1
"""

from fastapi import APIRouter

# Importer tous les routers
from app.api.v1.endpoints import branches, publications, admin

# Créer le router principal
api_router = APIRouter(prefix="/api/v1", tags=["v1"])

# Inclure tous les sous-routers
api_router.include_router(branches.router)
api_router.include_router(publications.router)
api_router.include_router(admin.router)

# Endpoints santé
@api_router.get("/health")
async def health():
    """Health check endpoint"""
    return {"status": "ok"}

__all__ = ["api_router"]
