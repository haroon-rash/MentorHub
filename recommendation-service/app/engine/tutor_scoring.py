"""Compute and cache tutor performance scores from platform data."""

from __future__ import annotations

import logging
import math
from datetime import datetime, timedelta, timezone

from app.cache.memory_cache import TTLCache
from app.config import settings
from app.db.pool import get_pool

logger = logging.getLogger(__name__)

_score_cache: TTLCache[dict] = TTLCache(default_ttl=settings.tutor_score_cache_ttl_seconds)

APPROVED_STATUS = 2
COMPLETED = 3
CANCELLED = 2


async def compute_all_tutor_scores(force: bool = False) -> dict[str, dict]:
    cached = _score_cache.get("__all__")
    if cached and not force:
        return cached

    pool = get_pool()
    async with pool.acquire() as conn:
        tutors = await conn.fetch(
            """
            SELECT tp."Id" AS id, tp."AverageRating", tp."ReviewCount",
                   tp."YearsOfExperience", tp."UpdatedAtUtc"
            FROM tutor_profiles tp
            WHERE tp."VerificationStatus" = $1
            """,
            APPROVED_STATUS,
        )

        booking_stats = await conn.fetch(
            """
            SELECT b."TutorProfileId" AS tutor_id,
                   COUNT(*) AS total,
                   COUNT(*) FILTER (WHERE b."Status" = $1) AS completed,
                   COUNT(*) FILTER (WHERE b."CreatedAtUtc" >= now() - interval '30 days') AS recent,
                   COUNT(DISTINCT b."StudentProfileId") AS unique_students,
                   COUNT(DISTINCT rs."StudentProfileId") AS repeat_students
            FROM bookings b
            LEFT JOIN (
                SELECT "TutorProfileId", "StudentProfileId"
                FROM bookings
                WHERE "Status" != $2
                GROUP BY "TutorProfileId", "StudentProfileId"
                HAVING COUNT(*) > 1
            ) rs ON rs."TutorProfileId" = b."TutorProfileId"
            WHERE b."Status" != $2
            GROUP BY b."TutorProfileId"
            """,
            COMPLETED,
            CANCELLED,
        )

        booking_reviews = await conn.fetch(
            """
            SELECT "TutorProfileId"::text AS tutor_id,
                   COUNT(*) AS review_count,
                   AVG(CASE WHEN LOWER(COALESCE("Sentiment", '')) = 'positive' THEN 1.0 ELSE 0.0 END) AS pos_ratio,
                   AVG(COALESCE("SentimentConfidence", 0.5)) AS avg_confidence,
                   AVG("Rating") AS avg_rating
            FROM reviews
            WHERE "BookingId" IS NOT NULL
            GROUP BY "TutorProfileId"
            """
        )

        enrollment_reviews = await conn.fetch(
            """
            SELECT "TutorProfileId"::text AS tutor_id,
                   COUNT(*) AS review_count,
                   AVG(CASE WHEN LOWER(COALESCE("Sentiment", '')) = 'positive' THEN 1.0 ELSE 0.0 END) AS pos_ratio,
                   AVG(COALESCE("SentimentConfidence", 0.5)) AS avg_confidence,
                   AVG("Rating") AS avg_rating
            FROM reviews
            WHERE "BatchEnrollmentId" IS NOT NULL
            GROUP BY "TutorProfileId"
            """
        )

        enrollment_stats = await conn.fetch(
            """
            SELECT "TutorProfileId"::text AS tutor_id,
                   COUNT(*) AS total_enrollments,
                   COUNT(*) FILTER (WHERE "Status" = 4) AS completed,
                   COUNT(*) FILTER (WHERE "Status" = 5) AS withdrawn
            FROM batch_enrollments
            WHERE "Status" NOT IN (3)
            GROUP BY "TutorProfileId"
            """
        )

        view_stats = await conn.fetch(
            """
            SELECT tutor_profile_id::text AS tutor_id, COUNT(*) AS views
            FROM student_interactions
            WHERE interaction_type IN ('view', 'click')
            GROUP BY tutor_profile_id
            """
        )

    booking_map = {str(r["tutor_id"]): dict(r) for r in booking_stats}
    booking_review_map = {str(r["tutor_id"]): dict(r) for r in booking_reviews}
    enrollment_review_map = {str(r["tutor_id"]): dict(r) for r in enrollment_reviews}
    enrollment_map = {str(r["tutor_id"]): dict(r) for r in enrollment_stats}
    view_map = {str(r["tutor_id"]): int(r["views"]) for r in view_stats}

    def _blend_review_stats(tid: str) -> dict:
        b = booking_review_map.get(tid, {})
        e = enrollment_review_map.get(tid, {})
        b_count = int(b.get("review_count") or 0)
        e_count = int(e.get("review_count") or 0)
        total = b_count + e_count
        if total == 0:
            return {"review_count": 0, "avg_rating": 0.0, "pos_ratio": 0.5, "avg_confidence": 0.5}
        w_b, w_e = 0.6, 0.4
        if b_count == 0:
            w_b, w_e = 0.0, 1.0
        elif e_count == 0:
            w_b, w_e = 1.0, 0.0
        avg_rating = (
            w_b * float(b.get("avg_rating") or 0) + w_e * float(e.get("avg_rating") or 0)
        )
        pos_ratio = (
            w_b * float(b.get("pos_ratio") or 0.5) + w_e * float(e.get("pos_ratio") or 0.5)
        )
        avg_conf = (
            w_b * float(b.get("avg_confidence") or 0.5) + w_e * float(e.get("avg_confidence") or 0.5)
        )
        return {
            "review_count": total,
            "avg_rating": avg_rating,
            "pos_ratio": pos_ratio,
            "avg_confidence": avg_conf,
        }

    scores: dict[str, dict] = {}
    now = datetime.now(timezone.utc)

    for tutor in tutors:
        tid = str(tutor["id"])
        b = booking_map.get(tid, {})
        s = _blend_review_stats(tid)
        en = enrollment_map.get(tid, {})
        views = view_map.get(tid, 0)

        total_bookings = int(b.get("total") or 0)
        completed = int(b.get("completed") or 0)
        recent = int(b.get("recent") or 0)
        unique_students = int(b.get("unique_students") or 0)
        repeat_students = int(b.get("repeat_students") or 0)

        total_enrollments = int(en.get("total_enrollments") or 0)
        completed_enrollments = int(en.get("completed") or 0)
        booking_completion = completed / total_bookings if total_bookings else 0.0
        enrollment_completion = (
            completed_enrollments / total_enrollments if total_enrollments else 0.0
        )
        if total_bookings and total_enrollments:
            completion_rate = 0.6 * booking_completion + 0.4 * enrollment_completion
        elif total_enrollments:
            completion_rate = enrollment_completion
        else:
            completion_rate = booking_completion

        repeat_ratio = repeat_students / unique_students if unique_students else 0.0

        avg_rating = float(s.get("avg_rating") or tutor["AverageRating"] or 0)
        review_count = int(s.get("review_count") or tutor["ReviewCount"] or 0)
        pos_ratio = float(s.get("pos_ratio") or 0.5)

        # Component scores 0–1
        rating_score = min(1.0, avg_rating / 5.0) if avg_rating else 0.45
        rating_score *= min(1.0, 0.6 + math.log1p(review_count) / 5.0)  # confidence from volume

        sentiment_score = pos_ratio * float(s.get("avg_confidence") or 0.75)
        review_rating_score = min(1.0, rating_score * 0.62 + sentiment_score * 0.38)

        booking_score = min(1.0, math.log1p(total_bookings) / 4.0)
        booking_score = min(1.0, booking_score * 0.7 + completion_rate * 0.3)

        withdrawn = int(en.get("withdrawn") or 0)
        enrollment_volume = min(1.0, math.log1p(total_enrollments) / 3.5)
        enrollment_quality = enrollment_completion
        if total_enrollments > 0:
            retention = 1.0 - (withdrawn / total_enrollments)
            enrollment_quality = min(1.0, enrollment_completion * 0.7 + retention * 0.3)
        enrollment_score = min(1.0, enrollment_volume * 0.55 + enrollment_quality * 0.45) if total_enrollments else 0.0

        popularity_score = min(1.0, (math.log1p(views) + math.log1p(total_bookings + total_enrollments)) / 5.0)
        engagement_score = min(1.0, recent / 5.0) if recent else 0.15
        experience_score = min(1.0, int(tutor["YearsOfExperience"] or 0) / 15.0)

        updated = tutor["UpdatedAtUtc"]
        if updated and (now - updated).days < 14:
            engagement_score = min(1.0, engagement_score + 0.1)

        # Tutor quality composite (used for trending; personalized rank uses ranker.py pillars)
        composite = (
            0.25 * review_rating_score
            + 0.20 * booking_score
            + 0.20 * enrollment_score
            + 0.12 * completion_rate
            + 0.08 * repeat_ratio
            + 0.08 * popularity_score
            + 0.07 * engagement_score
        )

        scores[tid] = {
            "tutor_profile_id": tid,
            "composite_score": round(composite, 4),
            "rating_score": round(rating_score, 4),
            "sentiment_score": round(sentiment_score, 4),
            "review_rating_score": round(review_rating_score, 4),
            "booking_score": round(booking_score, 4),
            "enrollment_score": round(enrollment_score, 4),
            "completion_rate": round(completion_rate, 4),
            "repeat_student_ratio": round(repeat_ratio, 4),
            "popularity_score": round(popularity_score, 4),
            "engagement_score": round(engagement_score, 4),
            "positive_sentiment_pct": round(pos_ratio * 100, 2),
            "total_bookings": total_bookings,
            "total_enrollments": total_enrollments,
            "average_rating": round(avg_rating, 2),
            "review_count": review_count,
        }

    await _persist_scores(scores)
    _score_cache.set("__all__", scores)
    return scores


async def _persist_scores(scores: dict[str, dict]) -> None:
    pool = get_pool()
    now = datetime.now(timezone.utc)
    async with pool.acquire() as conn:
        for tid, s in scores.items():
            await conn.execute(
                """
                INSERT INTO tutor_performance_scores (
                    tutor_profile_id, composite_score, rating_score, sentiment_score,
                    booking_score, completion_rate, repeat_student_ratio, popularity_score,
                    engagement_score, positive_sentiment_pct, total_bookings, computed_at_utc
                ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                ON CONFLICT (tutor_profile_id) DO UPDATE SET
                    composite_score = EXCLUDED.composite_score,
                    rating_score = EXCLUDED.rating_score,
                    sentiment_score = EXCLUDED.sentiment_score,
                    booking_score = EXCLUDED.booking_score,
                    completion_rate = EXCLUDED.completion_rate,
                    repeat_student_ratio = EXCLUDED.repeat_student_ratio,
                    popularity_score = EXCLUDED.popularity_score,
                    engagement_score = EXCLUDED.engagement_score,
                    positive_sentiment_pct = EXCLUDED.positive_sentiment_pct,
                    total_bookings = EXCLUDED.total_bookings,
                    computed_at_utc = EXCLUDED.computed_at_utc
                """,
                tid,
                s["composite_score"],
                s["rating_score"],
                s["sentiment_score"],
                s["booking_score"],
                s["completion_rate"],
                s["repeat_student_ratio"],
                s["popularity_score"],
                s["engagement_score"],
                s["positive_sentiment_pct"],
                s["total_bookings"],
                now,
            )


async def get_tutor_score(tutor_id: str) -> dict:
    all_scores = await compute_all_tutor_scores()
    return all_scores.get(tutor_id, {"composite_score": 0.35, "average_rating": 0, "review_count": 0})
