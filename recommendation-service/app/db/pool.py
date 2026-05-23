from __future__ import annotations

import logging
from pathlib import Path

import asyncpg

from app.config import settings

logger = logging.getLogger(__name__)

_pool: asyncpg.Pool | None = None


async def init_db() -> None:
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=settings.database_url,
        min_size=2,
        max_size=12,
        command_timeout=60,
    )
    await _run_migrations()
    logger.info("Database pool ready")


async def close_db() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


def get_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("Database pool not initialized")
    return _pool


async def _run_migrations() -> None:
    migration_path = Path(__file__).resolve().parents[2] / "migrations" / "001_recommendation_schema.sql"
    sql = migration_path.read_text(encoding="utf-8")
    pool = get_pool()
    async with pool.acquire() as conn:
        await conn.execute(sql)
    logger.info("Recommendation schema migration applied")
