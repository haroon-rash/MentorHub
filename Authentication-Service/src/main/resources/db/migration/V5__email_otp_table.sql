CREATE TABLE IF NOT EXISTS email_otp (
    id UUID PRIMARY KEY,
    email VARCHAR(255) NOT NULL,
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    is_used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_otp_email_used ON email_otp(email, is_used);
CREATE INDEX IF NOT EXISTS idx_email_otp_created_at ON email_otp(created_at);
