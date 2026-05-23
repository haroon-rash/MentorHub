-- Recommendation intelligence tables + student interests column

ALTER TABLE student_profiles
    ADD COLUMN IF NOT EXISTS "InterestsCsv" text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS student_interest_weights (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id varchar(120) NOT NULL,
    topic varchar(120) NOT NULL,
    weight double precision NOT NULL DEFAULT 1.0,
    source varchar(40) NOT NULL DEFAULT 'profile',
    updated_at_utc timestamptz NOT NULL DEFAULT now(),
    UNIQUE (auth_user_id, topic)
);

CREATE INDEX IF NOT EXISTS idx_interest_weights_auth ON student_interest_weights (auth_user_id);

CREATE TABLE IF NOT EXISTS student_interactions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id varchar(120) NOT NULL,
    tutor_profile_id uuid NOT NULL,
    interaction_type varchar(40) NOT NULL,
    metadata jsonb,
    created_at_utc timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_interactions_auth ON student_interactions (auth_user_id, created_at_utc DESC);
CREATE INDEX IF NOT EXISTS idx_interactions_tutor ON student_interactions (tutor_profile_id);

CREATE TABLE IF NOT EXISTS tutor_performance_scores (
    tutor_profile_id uuid PRIMARY KEY,
    composite_score double precision NOT NULL DEFAULT 0,
    rating_score double precision NOT NULL DEFAULT 0,
    sentiment_score double precision NOT NULL DEFAULT 0,
    booking_score double precision NOT NULL DEFAULT 0,
    completion_rate double precision NOT NULL DEFAULT 0,
    repeat_student_ratio double precision NOT NULL DEFAULT 0,
    popularity_score double precision NOT NULL DEFAULT 0,
    engagement_score double precision NOT NULL DEFAULT 0,
    positive_sentiment_pct double precision NOT NULL DEFAULT 0,
    total_bookings int NOT NULL DEFAULT 0,
    computed_at_utc timestamptz NOT NULL DEFAULT now()
);
