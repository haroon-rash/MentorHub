CREATE TABLE IF NOT EXISTS approved_tutor (
    tutor_profile_id UUID PRIMARY KEY,
    auth_user_id VARCHAR(120) NOT NULL UNIQUE,
    full_name VARCHAR(180) NOT NULL,
    email VARCHAR(180) NOT NULL,
    profile_photo_url TEXT,
    highest_degree VARCHAR(200),
    years_of_experience INTEGER,
    hourly_fee NUMERIC(12,2),
    subjects_csv TEXT,
    bio TEXT,
    teaching_methodology TEXT,
    teaching_mode VARCHAR(40),
    in_person_location VARCHAR(240),
    reviewed_at TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approved_tutor_reviewed_at ON approved_tutor(reviewed_at);
