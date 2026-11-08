-- Secure customer account sessions and minimal Telegram profile metadata.
CREATE TABLE IF NOT EXISTS user_profiles (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  username TEXT,
  updated_at INTEGER NOT NULL
);

-- Telegram Login Widget payloads are short-lived; storing a digest prevents replay.
CREATE TABLE IF NOT EXISTS account_login_events (
  payload_hash TEXT PRIMARY KEY CHECK (length(payload_hash) = 64),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  CHECK (expires_at > created_at)
);
CREATE INDEX IF NOT EXISTS account_login_events_expiry_idx
  ON account_login_events(expires_at);
