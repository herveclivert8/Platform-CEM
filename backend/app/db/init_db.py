"""
Initialiser la base de données - crée les tables
"""

import asyncio
from app.db.base import Base
from app.db.session import engine


async def init_db():
    """Créer toutes les tables"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✅ Tables de la base de données créées!")


if __name__ == "__main__":
    asyncio.run(init_db())
