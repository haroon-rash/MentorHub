"""Build and persist student interest vectors from profile + behavior."""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone

from app.db.pool import get_pool
from app.engine.text_utils import extract_keywords, normalize_topic, tokenize_topics

logger = logging.getLogger(__name__)

# Source weights — higher = stronger signal for personalization
SOURCE_WEIGHTS = {
    "search": 2.2,
    "click": 1.8,
    "view": 1.4,
    "book": 2.5,
    "booking_subject": 2.0,
    "enrollment_subject": 2.3,
    "interest": 1.3,
    "subject": 1.0,
    "difficulty": 0.85,
    "purpose": 0.7,
    "goal": 0.65,
}


async def build_interest_vector(auth_user_id: str) -> dict[str, float]:
    pool = get_pool()
    async with pool.acquire() as conn:
        profile = await conn.fetchrow(
            """
            SELECT sp."SubjectsCsv", sp."InterestsCsv", sp."TopicsOfDifficulty",
                   sp."TutoringPurpose", sp."LearningGoalsOrTargetGrade", sp."Id"
            FROM student_profiles sp
            JOIN user_accounts ua ON sp."UserAccountId" = ua.id
            WHERE ua.auth_user_id = $1
            LIMIT 1
            """,
            auth_user_id,
        )

        bookings = await conn.fetch(
            """
            SELECT b."Subject"
            FROM bookings b
            JOIN student_profiles sp ON b."StudentProfileId" = sp."Id"
            JOIN user_accounts ua ON sp."UserAccountId" = ua.id
            WHERE ua.auth_user_id = $1 AND b."Status" IN (0, 1, 3, 4)
            ORDER BY b."CreatedAtUtc" DESC
            LIMIT 40
            """,
            auth_user_id,
        )

        enrollments = await conn.fetch(
            """
            SELECT be."Subject"
            FROM batch_enrollments be
            JOIN student_profiles sp ON be."StudentProfileId" = sp."Id"
            JOIN user_accounts ua ON sp."UserAccountId" = ua.id
            WHERE ua.auth_user_id = $1
              AND be."Status" IN (1, 4, 2)
            ORDER BY be."CreatedAtUtc" DESC
            LIMIT 40
            """,
            auth_user_id,
        )

        interactions = await conn.fetch(
            """
            SELECT interaction_type, metadata
            FROM student_interactions
            WHERE auth_user_id = $1
            ORDER BY created_at_utc DESC
            LIMIT 80
            """,
            auth_user_id,
        )

        stored = await conn.fetch(
            """
            SELECT topic, weight, source
            FROM student_interest_weights
            WHERE auth_user_id = $1
            """,
            auth_user_id,
        )

    weights: dict[str, float] = {}

    def add(topic: str, base: float, source: str) -> None:
        t = normalize_topic(topic)
        if not t:
            return
        w = base * SOURCE_WEIGHTS.get(source, 1.0)
        weights[t] = weights.get(t, 0.0) + w

    if profile:
        for t in tokenize_topics(profile["SubjectsCsv"]):
            add(t, 1.0, "subject")
        for t in tokenize_topics(profile.get("InterestsCsv") or ""):
            add(t, 1.2, "interest")
        for t in extract_keywords(profile.get("TopicsOfDifficulty") or ""):
            add(t, 0.9, "difficulty")
        for t in extract_keywords(profile.get("TutoringPurpose") or ""):
            add(t, 0.8, "purpose")
        for t in extract_keywords(profile.get("LearningGoalsOrTargetGrade") or ""):
            add(t, 0.75, "goal")

    for row in bookings:
        for t in tokenize_topics(row["Subject"]):
            add(t, 1.1, "booking_subject")

    for row in enrollments:
        for t in tokenize_topics(row["Subject"]):
            add(t, 1.15, "enrollment_subject")

    for row in interactions:
        itype = row["interaction_type"]
        meta = row["metadata"]
        if isinstance(meta, str):
            try:
                meta = json.loads(meta)
            except json.JSONDecodeError:
                meta = {}
        meta = meta or {}
        if itype == "review_submitted":
            for t in tokenize_topics(meta.get("subject", "")):
                add(t, 1.25, "enrollment_subject")
            continue
        source = "view"
        if itype in ("search", "click", "book", "view"):
            source = itype
        for t in tokenize_topics(meta.get("query", "")):
            add(t, 1.0, source)
        for t in tokenize_topics(meta.get("subject", "")):
            add(t, 1.0, source)

    # Merge persisted weights (decay older stored weights slightly)
    for row in stored:
        add(row["topic"], float(row["weight"]) * 0.85, row["source"])

    # Normalize to 0–1 range
    if weights:
        max_w = max(weights.values())
        weights = {k: round(v / max_w, 4) for k, v in weights.items()}

    await _persist_weights(auth_user_id, weights)
    return weights


async def _persist_weights(auth_user_id: str, weights: dict[str, float]) -> None:
    if not weights:
        return
    pool = get_pool()
    now = datetime.now(timezone.utc)
    async with pool.acquire() as conn:
        async with conn.transaction():
            for topic, weight in weights.items():
                await conn.execute(
                    """
                    INSERT INTO student_interest_weights (auth_user_id, topic, weight, source, updated_at_utc)
                    VALUES ($1, $2, $3, 'computed', $4)
                    ON CONFLICT (auth_user_id, topic)
                    DO UPDATE SET weight = EXCLUDED.weight, updated_at_utc = EXCLUDED.updated_at_utc
                    """,
                    auth_user_id,
                    topic,
                    weight,
                    now,
                )


async def record_interaction(
    auth_user_id: str,
    tutor_profile_id: str,
    interaction_type: str,
    metadata: dict | None = None,
) -> None:
    pool = get_pool()
    meta = metadata or {}

    if interaction_type == "search" and meta.get("query"):
        for topic in tokenize_topics(meta["query"]):
            t = normalize_topic(topic)
            if not t:
                continue
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO student_interest_weights (auth_user_id, topic, weight, source, updated_at_utc)
                    VALUES ($1, $2, $3, 'search', now())
                    ON CONFLICT (auth_user_id, topic)
                    DO UPDATE SET weight = LEAST(student_interest_weights.weight + 0.15, 3.0),
                                  updated_at_utc = now()
                    """,
                    auth_user_id,
                    t,
                    SOURCE_WEIGHTS["search"],
                )
        return

    null_uuid = "00000000-0000-0000-0000-000000000000"
    if tutor_profile_id == null_uuid:
        return

    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO student_interactions (auth_user_id, tutor_profile_id, interaction_type, metadata)
            VALUES ($1, $2::uuid, $3, $4::jsonb)
            """,
            auth_user_id,
            tutor_profile_id,
            interaction_type,
            json.dumps(meta),
        )

    if meta.get("subject"):
        for topic in tokenize_topics(meta["subject"]):
            t = normalize_topic(topic)
            if not t:
                continue
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    INSERT INTO student_interest_weights (auth_user_id, topic, weight, source, updated_at_utc)
                    VALUES ($1, $2, $3, 'click', now())
                    ON CONFLICT (auth_user_id, topic)
                    DO UPDATE SET weight = LEAST(student_interest_weights.weight + 0.1, 3.0),
                                  updated_at_utc = now()
                    """,
                    auth_user_id,
                    t,
                    SOURCE_WEIGHTS["click"],
                )
