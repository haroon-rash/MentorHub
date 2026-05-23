ALTER TABLE email_otp ADD COLUMN IF NOT EXISTS purpose VARCHAR(32) NOT NULL DEFAULT 'EMAIL_VERIFY';

CREATE INDEX IF NOT EXISTS idx_email_otp_email_purpose_used ON email_otp(email, purpose, is_used);
