ALTER TABLE signup_user
    ADD COLUMN IF NOT EXISTS last_active_role VARCHAR(32) NULL;

CREATE INDEX IF NOT EXISTS idx_signup_user_last_active_role
    ON signup_user(last_active_role);
