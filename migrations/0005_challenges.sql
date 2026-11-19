-- Weekly design challenge: challenges, one entry per user per challenge, and one vote per user per entry.
-- Entries stay 'pending' until an admin approves them; only approved/winner entries are public.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS challenges (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  theme TEXT NOT NULL DEFAULT '',
  rules TEXT NOT NULL DEFAULT '',
  allowed_colors TEXT NOT NULL DEFAULT '[]',      -- JSON array of bead codes; [] = every color
  prize_percent INTEGER NOT NULL DEFAULT 20 CHECK (prize_percent BETWEEN 5 AND 50),
  starts_at INTEGER NOT NULL,
  ends_at INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS challenges_status_idx ON challenges(status, starts_at, ends_at);

CREATE TABLE IF NOT EXISTS challenge_entries (
  id TEXT PRIMARY KEY,
  challenge_id TEXT NOT NULL REFERENCES challenges(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  nickname TEXT NOT NULL,                          -- the only name ever shown publicly
  design_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'winner')),
  prize_code TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (challenge_id, user_id)
);
CREATE INDEX IF NOT EXISTS challenge_entries_public_idx ON challenge_entries(challenge_id, status);

CREATE TABLE IF NOT EXISTS challenge_votes (
  entry_id TEXT NOT NULL REFERENCES challenge_entries(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (entry_id, user_id)
);
