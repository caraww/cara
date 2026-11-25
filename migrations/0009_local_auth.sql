-- Local email/phone + password sign-in.
-- Telegram login remains only as a legacy identity link for existing accounts;
-- new customers create a local credential instead of opening Telegram.
CREATE TABLE IF NOT EXISTS local_credentials (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  login_id TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS local_credentials_login_idx
  ON local_credentials(login_id);
