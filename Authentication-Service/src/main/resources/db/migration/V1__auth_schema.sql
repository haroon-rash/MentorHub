CREATE TABLE IF NOT EXISTS signup_user (
    user_id UUID PRIMARY KEY,
    user_name VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL UNIQUE,
    user_password VARCHAR(255),
    is_verified BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP,
    role VARCHAR(32),
    review_status VARCHAR(32) DEFAULT 'APPROVED'
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'signup_user' AND column_name = 'is_varified'
    ) AND NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'signup_user' AND column_name = 'is_verified'
    ) THEN
        ALTER TABLE signup_user RENAME COLUMN is_varified TO is_verified;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'signup_user' AND column_name = 'role'
    ) THEN
        ALTER TABLE signup_user ALTER COLUMN role TYPE VARCHAR(32);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS provider (
    id UUID PRIMARY KEY,
    provider_name VARCHAR(64) NOT NULL,
    provider_user_id VARCHAR(255) NOT NULL,
    user_id UUID NOT NULL,
    CONSTRAINT fk_provider_user FOREIGN KEY (user_id) REFERENCES signup_user(user_id) ON DELETE CASCADE
);

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'provider' AND column_name = 'provider_name'
    ) THEN
        ALTER TABLE provider ALTER COLUMN provider_name TYPE VARCHAR(64);
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS revoked_token (
    id UUID PRIMARY KEY,
    token_id VARCHAR(255) NOT NULL UNIQUE,
    token_type VARCHAR(32) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_signup_user_email ON signup_user(user_email);
CREATE INDEX IF NOT EXISTS idx_signup_user_role_verified ON signup_user(role, is_verified);
CREATE INDEX IF NOT EXISTS idx_provider_name_user_id ON provider(provider_name, provider_user_id);
CREATE INDEX IF NOT EXISTS idx_revoked_token_token_id ON revoked_token(token_id);
CREATE INDEX IF NOT EXISTS idx_revoked_token_expires_at ON revoked_token(expires_at);
