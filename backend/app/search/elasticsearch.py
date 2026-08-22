"""Elasticsearch integration for full-text search."""
import logging
from typing import Optional

from elasticsearch import Elasticsearch
from elasticsearch.exceptions import ElasticsearchException

logger = logging.getLogger(__name__)

# Global ES client
es_client: Optional[Elasticsearch] = None


def init_elasticsearch(hosts: list[str] | str = "http://localhost:9200") -> bool:
    """Initialize Elasticsearch connection."""
    global es_client
    try:
        if isinstance(hosts, str):
            hosts = [hosts]
        es_client = Elasticsearch(hosts)
        es_client.info()  # Test connection
        logger.info("✅ Elasticsearch connected successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Elasticsearch connection failed: {e}")
        return False


def close_elasticsearch() -> None:
    """Close Elasticsearch connection."""
    global es_client
    if es_client:
        es_client.close()
        logger.info("Elasticsearch connection closed")


async def index_city(city: dict) -> bool:
    """Index city document in Elasticsearch."""
    if not es_client:
        return False

    try:
        doc = {
            "id": city.get("id"),
            "slug": city.get("slug"),
            "name": city.get("name"),
            "country": city.get("country"),
            "continent": city.get("continent"),
            "description": city.get("description", ""),
            "contact_name": city.get("contact_name", ""),
            "contact_email": city.get("contact_email", ""),
            "status": city.get("status"),
            "created_at": city.get("created_at"),
        }

        es_client.index(index="cities", id=city.get("id"), document=doc, refresh=True)
        logger.debug(f"Indexed city: {city.get('slug')}")
        return True

    except ElasticsearchException as e:
        logger.error(f"Failed to index city: {e}")
        return False


async def index_project(project: dict) -> bool:
    """Index project document in Elasticsearch."""
    if not es_client:
        return False

    try:
        doc = {
            "id": project.get("id"),
            "city_id": project.get("city_id"),
            "title": project.get("title"),
            "description": project.get("description", ""),
            "category": project.get("category"),
            "status": project.get("status"),
            "progress": project.get("progress", 0),
            "created_at": project.get("created_at"),
        }

        es_client.index(index="projects", id=project.get("id"), document=doc, refresh=True)
        logger.debug(f"Indexed project: {project.get('title')}")
        return True

    except ElasticsearchException as e:
        logger.error(f"Failed to index project: {e}")
        return False


async def search_cities(
    query: str,
    filters: Optional[dict] = None,
    limit: int = 20,
    skip: int = 0,
) -> dict:
    """
    Full-text search across cities.

    Args:
        query: Search query string
        filters: Optional filters {field: value}
        limit: Number of results
        skip: Number to skip (pagination)

    Returns:
        {results: [...], total: N}
    """
    if not es_client:
        return {"results": [], "total": 0}

    try:
        search_query = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": query,
                                "fields": [
                                    "name^3",  # Boost name matches
                                    "country^2",
                                    "continent",
                                    "description",
                                    "contact_name",
                                ],
                                "fuzziness": "AUTO",
                            }
                        }
                    ]
                }
            },
            "from": skip,
            "size": limit,
            "highlight": {
                "fields": {
                    "name": {},
                    "description": {},
                }
            },
        }

        # Add filters if provided
        if filters:
            for field, value in filters.items():
                search_query["query"]["bool"]["must"].append({
                    "term": {field: value}
                })

        results = es_client.search(index="cities", body=search_query)

        hits = results["hits"]["hits"]
        return {
            "results": [
                {
                    **hit["_source"],
                    "highlight": hit.get("highlight", {}),
                    "score": hit["_score"],
                }
                for hit in hits
            ],
            "total": results["hits"]["total"]["value"],
        }

    except ElasticsearchException as e:
        logger.error(f"Search failed: {e}")
        return {"results": [], "total": 0}


async def search_projects(
    query: str,
    city_id: Optional[int] = None,
    category: Optional[str] = None,
    limit: int = 20,
) -> dict:
    """Full-text search across projects."""
    if not es_client:
        return {"results": [], "total": 0}

    try:
        filters = {}
        if city_id:
            filters["city_id"] = city_id
        if category:
            filters["category"] = category

        search_query = {
            "query": {
                "bool": {
                    "must": [
                        {
                            "multi_match": {
                                "query": query,
                                "fields": [
                                    "title^3",
                                    "description",
                                    "category",
                                ],
                                "fuzziness": "AUTO",
                            }
                        }
                    ]
                }
            },
            "size": limit,
            "highlight": {
                "fields": {
                    "title": {},
                    "description": {},
                }
            },
        }

        if filters:
            for field, value in filters.items():
                search_query["query"]["bool"]["must"].append({
                    "term": {field: value}
                })

        results = es_client.search(index="projects", body=search_query)

        hits = results["hits"]["hits"]
        return {
            "results": [
                {
                    **hit["_source"],
                    "highlight": hit.get("highlight", {}),
                    "score": hit["_score"],
                }
                for hit in hits
            ],
            "total": results["hits"]["total"]["value"],
        }

    except ElasticsearchException as e:
        logger.error(f"Project search failed: {e}")
        return {"results": [], "total": 0}


async def delete_index(index: str) -> bool:
    """Delete an index."""
    if not es_client:
        return False

    try:
        es_client.indices.delete(index=index)
        logger.info(f"Deleted index: {index}")
        return True
    except ElasticsearchException as e:
        logger.warning(f"Failed to delete index: {e}")
        return False


async def reindex_all(db_session) -> bool:
    """Reindex all documents (for rebuilding indexes)."""
    if not es_client:
        return False

    try:
        # Clear existing indexes
        await delete_index("cities")
        await delete_index("projects")

        # Re-index from database
        from sqlalchemy import select
        from app.models.city import City, CityProject

        # Index all cities
        result = await db_session.execute(select(City))
        cities = result.scalars().all()
        for city in cities:
            await index_city(city.dict())

        # Index all projects
        result = await db_session.execute(select(CityProject))
        projects = result.scalars().all()
        for project in projects:
            await index_project(project.dict())

        logger.info(f"Re-indexed {len(cities)} cities and {len(projects)} projects")
        return True

    except Exception as e:
        logger.error(f"Reindexing failed: {e}")
        return False


async def get_search_suggestions(prefix: str, field: str = "name", limit: int = 10) -> list[str]:
    """Get autocomplete suggestions."""
    if not es_client:
        return []

    try:
        results = es_client.search(
            index="cities",
            body={
                "query": {
                    "match_phrase_prefix": {
                        field: {
                            "query": prefix,
                            "boost": 2,
                        }
                    }
                },
                "size": limit,
            },
        )

        return [hit["_source"][field] for hit in results["hits"]["hits"]]

    except ElasticsearchException:
        return []
