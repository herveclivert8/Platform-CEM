from fastapi import APIRouter

from app.api.v1.endpoints import auth_jwt, branches, publications, posts, donations, submissions, upload, admin, audit

api_router = APIRouter()

# Authentification
api_router.include_router(auth_jwt.router)

# Branches (antennes)
api_router.include_router(branches.router)

# Publications (bilans/rapports formels)
api_router.include_router(publications.router)

# Posts (actualités par pilier)
api_router.include_router(posts.router)

# Dons
api_router.include_router(donations.router)

# Dossiers porteurs de projet
api_router.include_router(submissions.router)

# Upload de fichiers
api_router.include_router(upload.router)

# Admin management
api_router.include_router(admin.router)

# Audit logging
api_router.include_router(audit.router)
