-- Hashed, revocable public order-tracking tokens.
-- The raw token is only returned once to the customer; D1 stores its SHA-256 hash.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS order_access_tokens (
  token_hash TEXT PRIMARY KEY CHECK (length(token_hash) = 64),
  order_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS order_access_tokens_order_idx
  ON order_access_tokens(order_id);
