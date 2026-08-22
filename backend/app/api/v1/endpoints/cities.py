from fastapi import APIRouter, Depends, HTTPException, Query, Path, status
from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user, require_role
from app.core.cache import async_cache, clear_cache_pattern
from app.db.session import get_db
from app.models.city import City, CityProject, CityNews, CityTeamMember
from app.models.user import User
from app.schemas.city import (
    CityCreate, CityRead, CityWithDetails, CityPaginated,
    CityProjectCreate, CityProjectRead,
    CityNewsCreate, CityNewsRead,
    CityTeamMemberCreate, CityTeamMemberRead,
)

router = APIRouter(prefix="/cities", tags=["cities"])


# ============================================================================
# CITIES — PUBLIC ENDPOINTS
# ============================================================================

@router.get("", response_model=list[CityRead])
@async_cache(ttl=300, key_prefix="list_cities")
async def list_cities(
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    continent: str | None = Query(None),
    status: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """Liste toutes les antennes (publique, cached 5min)."""
    query = select(City)

    if continent:
        query = query.where(City.continent == continent)
    if status:
        query = query.where(City.status == status)

    query = query.order_by(City.updated_at.desc()).offset(skip).limit(limit)

    result = await db.execute(query)
    cities = result.scalars().all()
    return [CityRead.from_orm(c) for c in cities]


@router.get("/{city_slug}", response_model=CityWithDetails)
async def get_city(
    city_slug: str = Path(..., pattern="^[a-z0-9-]{1,100}$"),
    db: AsyncSession = Depends(get_db)
):
    """Détails complets d'une antenne."""
    result = await db.execute(
        select(City)
        .where(City.slug == city_slug)
        .options(
            selectinload(City.projects),
            selectinload(City.news),
            selectinload(City.team_members),
        )
    )
    city = result.scalar_one_or_none()

    if not city:
        raise HTTPException(status_code=404, detail="Antenne non trouvée")

    return CityWithDetails.from_orm(city)


@router.get("/{city_slug}/projects", response_model=list[CityProjectRead])
async def get_city_projects(
    city_slug: str = Path(..., pattern="^[a-z0-9-]{1,100}$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Projets d'une antenne."""
    city_result = await db.execute(select(City).where(City.slug == city_slug))
    city = city_result.scalar_one_or_none()

    if not city:
        raise HTTPException(status_code=404, detail="Antenne non trouvée")

    result = await db.execute(
        select(CityProject)
        .where(CityProject.city_id == city.id)
        .order_by(CityProject.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    projects = result.scalars().all()
    return [CityProjectRead.from_orm(p) for p in projects]


@router.get("/{city_slug}/news", response_model=list[CityNewsRead])
async def get_city_news(
    city_slug: str = Path(..., pattern="^[a-z0-9-]{1,100}$"),
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    """Actualités d'une antenne."""
    city_result = await db.execute(select(City).where(City.slug == city_slug))
    city = city_result.scalar_one_or_none()

    if not city:
        raise HTTPException(status_code=404, detail="Antenne non trouvée")

    result = await db.execute(
        select(CityNews)
        .where(CityNews.city_id == city.id)
        .where(CityNews.published == True)
        .order_by(CityNews.published_at.desc())
        .offset(skip)
        .limit(limit)
    )
    news = result.scalars().all()
    return [CityNewsRead.from_orm(n) for n in news]


@router.get("/{city_slug}/team", response_model=list[CityTeamMemberRead])
async def get_city_team(
    city_slug: str = Path(..., pattern="^[a-z0-9-]{1,100}$"),
    db: AsyncSession = Depends(get_db),
):
    """Équipe d'une antenne."""
    city_result = await db.execute(select(City).where(City.slug == city_slug))
    city = city_result.scalar_one_or_none()

    if not city:
        raise HTTPException(status_code=404, detail="Antenne non trouvée")

    result = await db.execute(
        select(CityTeamMember)
        .where(CityTeamMember.city_id == city.id)
        .order_by(CityTeamMember.name)
    )
    members = result.scalars().all()
    return [CityTeamMemberRead.from_orm(m) for m in members]


# ============================================================================
# CITIES — ADMIN ENDPOINTS (super_admin only)
# ============================================================================

@router.post("/admin", response_model=CityRead, status_code=status.HTTP_201_CREATED)
async def create_city(
    payload: CityCreate,
    current_user: User = Depends(require_role(["super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Créer une nouvelle antenne (super_admin uniquement)."""
    # Vérifier le slug unique
    existing = await db.execute(select(City).where(City.slug == payload.slug))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="Ce slug existe déjà")

    city = City(**payload.dict())
    db.add(city)
    await db.commit()
    await db.refresh(city)

    # Invalidate cache
    await clear_cache_pattern("list_cities*")

    return CityRead.from_orm(city)


@router.patch("/admin/{city_id}", response_model=CityRead)
async def update_city(
    city_id: int,
    payload: CityCreate,
    current_user: User = Depends(require_role(["super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Mettre à jour une antenne."""
    city = await db.get(City, city_id)
    if not city:
        raise HTTPException(status_code=404, detail="Antenne non trouvée")

    for key, value in payload.dict(exclude_unset=True).items():
        setattr(city, key, value)

    await db.commit()
    await db.refresh(city)

    return CityRead.from_orm(city)


@router.delete("/admin/{city_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_city(
    city_id: int,
    current_user: User = Depends(require_role(["super_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer une antenne."""
    city = await db.get(City, city_id)
    if not city:
        raise HTTPException(status_code=404, detail="Antenne non trouvée")

    await db.delete(city)
    await db.commit()


# ============================================================================
# CITY PROJECTS — ADMIN ENDPOINTS
# ============================================================================

@router.post("/admin/{city_id}/projects", response_model=CityProjectRead, status_code=status.HTTP_201_CREATED)
async def create_city_project(
    city_id: int,
    payload: CityProjectCreate,
    current_user: User = Depends(require_role(["super_admin", "city_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Créer un projet pour une antenne."""
    city = await db.get(City, city_id)
    if not city:
        raise HTTPException(status_code=404, detail="Antenne non trouvée")

    project = CityProject(city_id=city_id, **payload.dict())
    db.add(project)
    await db.commit()
    await db.refresh(project)

    return CityProjectRead.from_orm(project)


@router.patch("/admin/projects/{project_id}", response_model=CityProjectRead)
async def update_city_project(
    project_id: int,
    payload: CityProjectCreate,
    current_user: User = Depends(require_role(["super_admin", "city_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Mettre à jour un projet."""
    project = await db.get(CityProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    for key, value in payload.dict(exclude_unset=True).items():
        setattr(project, key, value)

    await db.commit()
    await db.refresh(project)

    return CityProjectRead.from_orm(project)


@router.delete("/admin/projects/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_city_project(
    project_id: int,
    current_user: User = Depends(require_role(["super_admin", "city_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer un projet."""
    project = await db.get(CityProject, project_id)
    if not project:
        raise HTTPException(status_code=404, detail="Projet non trouvé")

    await db.delete(project)
    await db.commit()


# ============================================================================
# CITY NEWS — ADMIN ENDPOINTS
# ============================================================================

@router.post("/admin/{city_id}/news", response_model=CityNewsRead, status_code=status.HTTP_201_CREATED)
async def create_city_news(
    city_id: int,
    payload: CityNewsCreate,
    current_user: User = Depends(require_role(["super_admin", "city_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Créer une actualité pour une antenne."""
    city = await db.get(City, city_id)
    if not city:
        raise HTTPException(status_code=404, detail="Antenne non trouvée")

    news = CityNews(city_id=city_id, **payload.dict())
    db.add(news)
    await db.commit()
    await db.refresh(news)

    return CityNewsRead.from_orm(news)


@router.patch("/admin/news/{news_id}", response_model=CityNewsRead)
async def update_city_news(
    news_id: int,
    payload: CityNewsCreate,
    current_user: User = Depends(require_role(["super_admin", "city_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Mettre à jour une actualité."""
    news = await db.get(CityNews, news_id)
    if not news:
        raise HTTPException(status_code=404, detail="Actualité non trouvée")

    for key, value in payload.dict(exclude_unset=True).items():
        setattr(news, key, value)

    await db.commit()
    await db.refresh(news)

    return CityNewsRead.from_orm(news)


@router.delete("/admin/news/{news_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_city_news(
    news_id: int,
    current_user: User = Depends(require_role(["super_admin", "city_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer une actualité."""
    news = await db.get(CityNews, news_id)
    if not news:
        raise HTTPException(status_code=404, detail="Actualité non trouvée")

    await db.delete(news)
    await db.commit()


# ============================================================================
# CITY TEAM — ADMIN ENDPOINTS
# ============================================================================

@router.post("/admin/{city_id}/team", response_model=CityTeamMemberRead, status_code=status.HTTP_201_CREATED)
async def create_city_team_member(
    city_id: int,
    payload: CityTeamMemberCreate,
    current_user: User = Depends(require_role(["super_admin", "city_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Ajouter un membre à l'équipe d'une antenne."""
    city = await db.get(City, city_id)
    if not city:
        raise HTTPException(status_code=404, detail="Antenne non trouvée")

    member = CityTeamMember(city_id=city_id, **payload.dict())
    db.add(member)
    await db.commit()
    await db.refresh(member)

    return CityTeamMemberRead.from_orm(member)


@router.patch("/admin/team/{member_id}", response_model=CityTeamMemberRead)
async def update_city_team_member(
    member_id: int,
    payload: CityTeamMemberCreate,
    current_user: User = Depends(require_role(["super_admin", "city_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Mettre à jour un membre de l'équipe."""
    member = await db.get(CityTeamMember, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")

    for key, value in payload.dict(exclude_unset=True).items():
        setattr(member, key, value)

    await db.commit()
    await db.refresh(member)

    return CityTeamMemberRead.from_orm(member)


@router.delete("/admin/team/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_city_team_member(
    member_id: int,
    current_user: User = Depends(require_role(["super_admin", "city_admin"])),
    db: AsyncSession = Depends(get_db),
):
    """Supprimer un membre de l'équipe."""
    member = await db.get(CityTeamMember, member_id)
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")

    await db.delete(member)
    await db.commit()
