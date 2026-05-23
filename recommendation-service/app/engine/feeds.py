"""Generate personalized feed sections (YouTube/Udemy-style)."""

from __future__ import annotations

from collections import defaultdict
from typing import Any

from app.config import settings
from app.engine.interest_profile import build_interest_vector
from app.engine.ranker import rank_tutors
from app.engine.tutor_scoring import compute_all_tutor_scores
from app.db.pool import get_pool


TEACHING_MODE_MAP = {0: "Online", 1: "In-Person", 2: "Both", 3: "Hybrid"}


async def load_approved_tutors() -> list[dict[str, Any]]:
    pool = get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT tp."Id" AS tutor_profile_id,
                   ua.auth_user_id,
                   ua.full_name,
                   tp."ProfilePhotoUrl" AS profile_photo_url,
                   tp."SubjectsCsv" AS subjects_csv,
                   tp."GradeLevelsCsv" AS grade_levels_csv,
                   tp."Bio" AS bio,
                   tp."TeachingMethodology" AS teaching_methodology,
                   tp."HourlyFee" AS hourly_fee,
                   tp."AverageRating" AS average_rating,
                   tp."ReviewCount" AS review_count,
                   tp."YearsOfExperience" AS years_of_experience,
                   tp."TeachingMode" AS teaching_mode,
                   tp."LanguagesCsv" AS languages_csv,
                   tp."InPersonLocation" AS in_person_location
            FROM tutor_profiles tp
            JOIN user_accounts ua ON tp."UserAccountId" = ua.id
            WHERE tp."VerificationStatus" = 2
              AND NULLIF(TRIM(ua.full_name), '') IS NOT NULL
              AND tp."HourlyFee" > 0
            """
        )
    tutors = []
    for r in rows:
        d = dict(r)
        name = (d.get("full_name") or "").strip()
        fee = float(d.get("hourly_fee") or 0)
        if not name or fee <= 0:
            continue
        d["teaching_mode_label"] = TEACHING_MODE_MAP.get(int(d.get("teaching_mode") or 0), "Online")
        d["hourly_fee"] = fee
        d["average_rating"] = float(d.get("average_rating") or 0)
        d["review_count"] = int(d.get("review_count") or 0)
        tutors.append(d)
    return tutors


async def load_student_context(auth_user_id: str) -> tuple[dict | None, set[str], set[str], dict[str, float]]:
    pool = get_pool()
    async with pool.acquire() as conn:
        profile = await conn.fetchrow(
            """
            SELECT sp."BudgetPerSession", sp."PreferredMode", sp."PreferredLanguageOfInstruction",
                   sp."SubjectsCsv", sp."InterestsCsv"
            FROM student_profiles sp
            JOIN user_accounts ua ON sp."UserAccountId" = ua.id
            WHERE ua.auth_user_id = $1
            """,
            auth_user_id,
        )

        booked = await conn.fetch(
            """
            SELECT DISTINCT b."TutorProfileId"::text AS tutor_id
            FROM bookings b
            JOIN student_profiles sp ON b."StudentProfileId" = sp."Id"
            JOIN user_accounts ua ON sp."UserAccountId" = ua.id
            WHERE ua.auth_user_id = $1 AND b."Status" IN (0, 1, 3, 4)
            """,
            auth_user_id,
        )

        enrolled = await conn.fetch(
            """
            SELECT DISTINCT be."TutorProfileId"::text AS tutor_id
            FROM batch_enrollments be
            JOIN student_profiles sp ON be."StudentProfileId" = sp."Id"
            JOIN user_accounts ua ON sp."UserAccountId" = ua.id
            WHERE ua.auth_user_id = $1 AND be."Status" IN (1, 4, 2)
            """,
            auth_user_id,
        )

        interactions = await conn.fetch(
            """
            SELECT tutor_profile_id::text AS tutor_id, COUNT(*) AS cnt
            FROM student_interactions
            WHERE auth_user_id = $1 AND created_at_utc >= now() - interval '30 days'
            GROUP BY tutor_profile_id
            """,
            auth_user_id,
        )

    student_profile = None
    if profile:
        student_profile = {
            "budget_per_session": float(profile["BudgetPerSession"] or 0),
            "preferred_mode": profile["PreferredMode"],
            "preferred_language": profile["PreferredLanguageOfInstruction"],
            "subjects_csv": profile["SubjectsCsv"],
            "interests_csv": profile.get("InterestsCsv"),
        }

    booked_ids = {r["tutor_id"] for r in booked}
    enrolled_ids = {r["tutor_id"] for r in enrolled}
    boosts = {r["tutor_id"]: min(0.35, int(r["cnt"]) * 0.06) for r in interactions}
    return student_profile, booked_ids, enrolled_ids, boosts


async def build_personalized_feed(auth_user_id: str) -> dict[str, Any]:
    interest_vector = await build_interest_vector(auth_user_id)
    tutor_scores = await compute_all_tutor_scores()
    tutors = await load_approved_tutors()
    student_profile, booked_ids, enrolled_ids, interaction_boosts = await load_student_context(auth_user_id)

    ranked = rank_tutors(
        tutors,
        interest_vector,
        student_profile,
        tutor_scores,
        interaction_boosts,
        booked_ids,
        enrolled_ids,
    )

    limit = settings.max_feed_size

    # Section builders
    recommended = ranked[:limit]

    trending = sorted(
        ranked,
        key=lambda t: (
            float(tutor_scores.get(str(t["tutor_profile_id"]), {}).get("engagement_score") or 0) * 0.5
            + float(tutor_scores.get(str(t["tutor_profile_id"]), {}).get("popularity_score") or 0) * 0.5
        ),
        reverse=True,
    )[:12]

    best_match = sorted(ranked, key=lambda t: t["recommendation_score"], reverse=True)[:12]

    continue_learning = [
        t for t in ranked
        if str(t["tutor_profile_id"]) in booked_ids or str(t["tutor_profile_id"]) in enrolled_ids
    ][:8]

    # Top by subject — student's top interest topics
    top_topics = sorted(interest_vector.items(), key=lambda x: x[1], reverse=True)[:4]
    top_by_subject: list[dict] = []
    for topic, weight in top_topics:
        subject_tutors = [
            t for t in ranked
            if topic in (t.get("subjects_csv") or "").lower()
            or any(topic in s.lower() for s in (t.get("subjects_csv") or "").split(","))
        ][:8]
        if subject_tutors:
            top_by_subject.append({
                "subject": topic.title(),
                "weight": round(weight, 2),
                "tutors": [_format_tutor_card(t) for t in subject_tutors],
            })

    # Similar tutors — cluster by primary subject of top recommended
    similar_tutors: list[dict] = []
    if recommended:
        anchor = recommended[0]
        anchor_subjects = set((anchor.get("subjects_csv") or "").lower().split(","))
        similar = [
            t for t in ranked[1:]
            if str(t["tutor_profile_id"]) != str(anchor["tutor_profile_id"])
            and anchor_subjects & set((t.get("subjects_csv") or "").lower().split(","))
        ][:8]
        if similar:
            similar_tutors = similar

    return {
        "success": True,
        "personalized": bool(interest_vector),
        "interest_topics": list(interest_vector.keys())[:12],
        "sections": {
            "recommended_for_you": _section("Recommended For You", recommended[:12]),
            "trending_tutors": _section("Trending Tutors", trending),
            "best_match": _section("Best Match For You", best_match),
            "top_by_subject": top_by_subject,
            "continue_learning": _section("Continue Learning", continue_learning),
            "similar_tutors": _section("Similar Tutors You May Like", similar_tutors),
        },
        "meta": {
            "algorithm": "four_pillar_v2",
            "pillars": {
                "subject_interest": 0.35,
                "booking": 0.20,
                "review_rating": 0.25,
                "enrollment": 0.20,
            },
            "description": "Ranked by subject interest, bookings, reviews/ratings, and course enrollments",
            "tutor_count": len(tutors),
        },
    }


def _section(title: str, tutors: list[dict]) -> dict:
    return {
        "title": title,
        "count": len(tutors),
        "tutors": [_format_tutor_card(t) for t in tutors],
    }


def _format_tutor_card(tutor: dict) -> dict:
    from app.engine.text_utils import tokenize_topics

    subjects = tokenize_topics(tutor.get("subjects_csv"))
    return {
        "tutorProfileId": str(tutor["tutor_profile_id"]),
        "authUserId": tutor.get("auth_user_id"),
        "fullName": tutor.get("full_name"),
        "profilePhotoUrl": tutor.get("profile_photo_url"),
        "subjects": subjects,
        "primarySubject": subjects[0] if subjects else "General",
        "bio": (tutor.get("bio") or "")[:220],
        "hourlyFee": tutor.get("hourly_fee"),
        "averageRating": tutor.get("average_rating"),
        "reviewCount": tutor.get("review_count"),
        "yearsOfExperience": tutor.get("years_of_experience"),
        "teachingMode": tutor.get("teaching_mode_label"),
        "languages": tokenize_topics(tutor.get("languages_csv")),
        "recommendationScore": tutor.get("recommendation_score"),
        "matchReasons": tutor.get("match_reasons", []),
    }


async def get_similar_tutors(tutor_profile_id: str, auth_user_id: str | None = None) -> list[dict]:
    tutors = await load_approved_tutors()
    tutor_scores = await compute_all_tutor_scores()
    interest_vector = await build_interest_vector(auth_user_id) if auth_user_id else {}
    student_profile, booked_ids, enrolled_ids, boosts = (
        await load_student_context(auth_user_id) if auth_user_id else (None, set(), set(), {})
    )

    ranked = rank_tutors(
        tutors, interest_vector, student_profile, tutor_scores, boosts, booked_ids, enrolled_ids
    )
    anchor = next((t for t in ranked if str(t["tutor_profile_id"]) == tutor_profile_id), None)
    if not anchor:
        return []

    anchor_subjects = set((anchor.get("subjects_csv") or "").lower().split(","))
    similar = [
        t for t in ranked
        if str(t["tutor_profile_id"]) != tutor_profile_id
        and anchor_subjects & set((t.get("subjects_csv") or "").lower().split(","))
    ][:10]
    return [_format_tutor_card(t) for t in similar]
