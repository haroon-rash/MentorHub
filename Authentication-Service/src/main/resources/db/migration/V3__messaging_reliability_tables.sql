CREATE TABLE IF NOT EXISTS outbox_message (
    id UUID PRIMARY KEY,
    event_id VARCHAR(255) NOT NULL UNIQUE,
    event_type VARCHAR(255) NOT NULL,
    exchange_name VARCHAR(255) NOT NULL,
    routing_key VARCHAR(255) NOT NULL,
    payload BYTEA NOT NULL,
    status VARCHAR(32) NOT NULL,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_attempt_at TIMESTAMP NOT NULL,
    last_error TEXT,
    published_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processed_event (
    id UUID PRIMARY KEY,
    consumer_name VARCHAR(255) NOT NULL,
    idempotency_key VARCHAR(255) NOT NULL,
    processed_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_outbox_event_id ON outbox_message(event_id);
CREATE INDEX IF NOT EXISTS idx_outbox_status_next_attempt ON outbox_message(status, next_attempt_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_processed_consumer_event ON processed_event(consumer_name, idempotency_key);
