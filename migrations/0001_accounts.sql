-- Account foundation for cara.
-- Apply to a new Cloudflare D1 database in preview first.
-- Existing ORDERS KV records and the payment lifecycle are intentionally untouched.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS identity_links (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('telegram', 'bale')),
  provider_subject TEXT NOT NULL,
  verified_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (provider, provider_subject)
);

CREATE INDEX IF NOT EXISTS identity_links_user_idx
  ON identity_links(user_id);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY
    CHECK (length(token_hash) = 64),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  last_seen_at INTEGER,
  CHECK (expires_at > created_at)
);

CREATE INDEX IF NOT EXISTS sessions_user_expiry_idx
  ON sessions(user_id, expires_at);

CREATE TABLE IF NOT EXISTS designs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  design_json TEXT NOT NULL CHECK (json_valid(design_json)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS designs_user_updated_idx
  ON designs(user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS carts (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
  guest_id TEXT,
  currency TEXT NOT NULL DEFAULT 'IRR' CHECK (currency = 'IRR'),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  CHECK (
    (user_id IS NOT NULL AND guest_id IS NULL) OR
    (user_id IS NULL AND guest_id IS NOT NULL AND length(guest_id) BETWEEN 32 AND 128)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS carts_one_per_user_idx
  ON carts(user_id) WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS carts_one_per_guest_idx
  ON carts(guest_id) WHERE guest_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS cart_items (
  id TEXT PRIMARY KEY,
  cart_id TEXT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  item_key TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('design', 'work')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity BETWEEN 1 AND 20),
  snapshot_json TEXT NOT NULL CHECK (json_valid(snapshot_json)),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (cart_id, item_key)
);

CREATE INDEX IF NOT EXISTS cart_items_cart_updated_idx
  ON cart_items(cart_id, updated_at);

-- Order access tokens are reserved for a later, separately reviewed tracking phase.
-- Store only SHA-256 hashes; never store or log the raw bearer token.
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
