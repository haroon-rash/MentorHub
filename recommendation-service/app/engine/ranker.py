"""Personalized tutor ranking — four-pillar hybrid recommender.

Pillars (weights sum to 1.0):
  1. Subject interest — profile + behavior topic match
  2. Booking — session volume, completion, prior bookings with tutor
  3. Review + rating — stars and sentiment from bookings and enrollments
  4. Enrollment — package/course volume and completion
"""

from __future__ import annotations

from typing import Any

from app.engine.text_utils import cosine_similarity_weights, jaccard_similarity, normalize_topic, tokenize_topics

# Four recommendation pillars
W_SUBJECT_INTEREST = 0.35
W_BOOKING = 0.20
W_REVIEW_RATING = 0.25
W_ENROLLMENT = 0.20

# Small profile-fit adjustments (applied as multipliers, not separate pillars)
BUDGET_MODE_CAP = 0.08


def rank_tutors(
    tutors: list[dict[str, Any]],
    interest_vector: dict[str, float],
    student_profile: dict | None,
    tutor_scores: dict[str, dict],
    interaction_boosts: dict[str, float],
    booked_tutor_ids: set[str],
    enrolled_tutor_ids: set[str] | None = None,
) -> list[dict[str, Any]]:
    """Return tutors with recommendation_score and match_reasons, sorted desc."""
    profile = student_profile or {}
    budget = float(profile.get("budget_per_session") or 0)
    preferred_mode = str(profile.get("preferred_mode") or "").lower()
    enrolled = enrolled_tutor_ids or set()

    ranked: list[dict[str, Any]] = []

    for tutor in tutors:
        tid = str(tutor["tutor_profile_id"])
        score_meta = tutor_scores.get(tid, {})
        tutor_subjects = tokenize_topics(tutor.get("subjects_csv") or tutor.get("subjects"))

        # 1. Subject interest
        subject_interest = cosine_similarity_weights(interest_vector, tutor_subjects)
        if subject_interest < 0.05:
            subject_interest = jaccard_similarity(interest_vector.keys(), tutor_subjects) * 0.85

        # 2. Booking signal
        booking_base = float(score_meta.get("booking_score") or 0.0)
        booking_completion = float(score_meta.get("completion_rate") or 0.0)
        booking_signal = min(1.0, booking_base * 0.65 + booking_completion * 0.35)
        if tid in booked_tutor_ids:
            booking_signal = min(1.0, booking_signal * 1.18)

        # 3. Review + rating (booking + enrollment reviews blended in tutor_scoring)
        rating = float(score_meta.get("rating_score") or 0.45)
        sentiment = float(score_meta.get("sentiment_score") or 0.5)
        review_rating = min(1.0, rating * 0.62 + sentiment * 0.38)

        # 4. Enrollment / package courses
        enrollment_signal = float(score_meta.get("enrollment_score") or 0.0)
        if tid in enrolled:
            enrollment_signal = min(1.0, enrollment_signal * 1.2 + 0.12)

        base = (
            W_SUBJECT_INTEREST * subject_interest
            + W_BOOKING * booking_signal
            + W_REVIEW_RATING * review_rating
            + W_ENROLLMENT * enrollment_signal
        )

        # Profile fit multiplier (budget + mode)
        budget_fit = 1.0
        fee = float(tutor.get("hourly_fee") or 0)
        if budget > 0 and fee > 0:
            budget_fit = 1.0 if fee <= budget else max(0.75, 1.0 - (fee - budget) / max(budget, 1))

        mode_fit = 0.9
        teaching_mode = str(tutor.get("teaching_mode_label") or "").lower()
        if preferred_mode and teaching_mode:
            if preferred_mode in teaching_mode or teaching_mode in preferred_mode:
                mode_fit = 1.0
            elif "both" in teaching_mode or "hybrid" in teaching_mode:
                mode_fit = 0.98

        profile_multiplier = 1.0 + BUDGET_MODE_CAP * ((budget_fit + mode_fit) / 2.0 - 0.9)

        behavior_boost = 1.0 + min(0.2, interaction_boosts.get(tid, 0.0))
        final_score = base * profile_multiplier * behavior_boost

        reasons = _build_reasons(
            tutor,
            subject_interest,
            interest_vector,
            tutor_subjects,
            score_meta,
            tid in booked_tutor_ids,
            tid in enrolled,
        )

        item = {
            **tutor,
            "recommendation_score": round(final_score, 4),
            "match_reasons": reasons,
            "score_breakdown": {
                "subject_interest": round(subject_interest, 3),
                "booking": round(booking_signal, 3),
                "review_rating": round(review_rating, 3),
                "enrollment": round(enrollment_signal, 3),
            },
        }
        ranked.append(item)

    ranked.sort(key=lambda x: x["recommendation_score"], reverse=True)
    return ranked


def _build_reasons(
    tutor: dict,
    subject_interest: float,
    interest_vector: dict[str, float],
    tutor_subjects: list[str],
    score_meta: dict,
    is_booked: bool,
    is_enrolled: bool,
) -> list[str]:
    reasons: list[str] = []
    if is_enrolled:
        reasons.append("You are enrolled in their course package")
    elif is_booked:
        reasons.append("Continue learning with this tutor")

    matched = [t for t in tutor_subjects if normalize_topic(t) in interest_vector]
    if matched:
        reasons.append(f"Matches your interest in {', '.join(matched[:3])}")
    elif subject_interest >= 0.5:
        reasons.append("Strong subject alignment")

    avg = score_meta.get("average_rating")
    review_count = int(score_meta.get("review_count") or 0)
    if avg and float(avg) >= 4.5 and review_count >= 1:
        reasons.append(f"Highly rated ({avg}★ from {review_count} review{'s' if review_count != 1 else ''})")

    pos = score_meta.get("positive_sentiment_pct")
    if pos and float(pos) >= 75 and review_count >= 2:
        reasons.append(f"{int(pos)}% positive review sentiment")

    total_enrollments = int(score_meta.get("total_enrollments") or 0)
    if total_enrollments >= 3:
        reasons.append("Popular for course packages")

    bookings = score_meta.get("total_bookings") or 0
    if int(bookings) >= 5 and not is_enrolled:
        reasons.append("Trusted for 1:1 sessions")

    if not reasons:
        reasons.append("Recommended from your subjects, bookings, and reviews")
    return reasons[:3]
