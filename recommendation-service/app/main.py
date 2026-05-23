"""MentorHub Recommendation Service — personalized tutor feeds."""

from __future__ import annotations

import logging

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.cache.memory_cache import TTLCache
from app.config import settings
from app.db.pool import close_db, init_db
from app.engine.feeds import build_personalized_feed, get_similar_tutors
from app.engine.interest_profile import record_interaction
from app.engine.tutor_scoring import compute_all_tutor_scores

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

feed_cache: TTLCache[dict] = TTLCache(default_ttl=settings.feed_cache_ttl_seconds)

app = FastAPI(
    title="MentorHub Recommendation Service",
    version="1.0.0",
    description="Hybrid personalized tutor ranking (content-based + behavioral + collaborative signals)",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class InteractionRequest(BaseModel):
    tutor_profile_id: str | None = None
    interaction_type: str = Field(
        ...,
        pattern="^(view|click|search|book|review_submitted)$",
    )
    query: str | None = None
    subject: str | None = None
    metadata: dict | None = None
    auth_user_id: str | None = None


@app.on_event("startup")
async def startup():
    await init_db()
    try:
        await compute_all_tutor_scores(force=True)
        logger.info("Tutor performance scores precomputed")
    except Exception as exc:
        logger.warning("Initial score computation failed: %s", exc)


@app.on_event("shutdown")
async def shutdown():
    await close_db()


@app.get("/health")
async def health():
    return {"status": "healthy", "service": "recommendation-service", "engine": "four_pillar_v2"}


@app.get("/api/v1/recommendations/feed")
async def get_feed(
    x_auth_user_id: str | None = Header(default=None, alias="X-Auth-User-Id"),
):
    if not x_auth_user_id:
        raise HTTPException(401, "X-Auth-User-Id header required")

    cache_key = f"feed:{x_auth_user_id}"
    cached = feed_cache.get(cache_key)
    if cached:
        cached["cached"] = True
        return cached

    feed = await build_personalized_feed(x_auth_user_id)
    feed["cached"] = False
    feed_cache.set(cache_key, feed)
    return feed


@app.post("/api/v1/recommendations/interactions")
async def track_interaction(
    body: InteractionRequest,
    x_auth_user_id: str | None = Header(default=None, alias="X-Auth-User-Id"),
):
    auth_user_id = x_auth_user_id or body.auth_user_id
    if not auth_user_id:
        raise HTTPException(401, "X-Auth-User-Id header or auth_user_id required")

    metadata = dict(body.metadata or {})
    if body.query:
        metadata["query"] = body.query
    if body.subject:
        metadata["subject"] = body.subject

    if body.interaction_type == "search" or body.tutor_profile_id:
        await record_interaction(
            auth_user_id,
            body.tutor_profile_id or "00000000-0000-0000-0000-000000000000",
            body.interaction_type,
            metadata,
        )
    feed_cache.invalidate_prefix(f"feed:{auth_user_id}")
    return {"success": True}


@app.get("/api/v1/recommendations/tutors/{tutor_profile_id}/similar")
async def similar_tutors(
    tutor_profile_id: str,
    x_auth_user_id: str | None = Header(default=None, alias="X-Auth-User-Id"),
):
    items = await get_similar_tutors(tutor_profile_id, x_auth_user_id)
    return {"success": True, "data": items}


@app.post("/api/v1/recommendations/recompute")
async def recompute_scores():
    """Admin/cron: refresh tutor performance scores."""
    scores = await compute_all_tutor_scores(force=True)
    feed_cache.invalidate_prefix("feed:")
    return {"success": True, "tutors_scored": len(scores)}
