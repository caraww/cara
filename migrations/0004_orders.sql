-- Orders mirror (stage 1 of the KV -> D1 order migration).
-- KV (ORDERS) stays the source of truth; every saveOrder() also upserts a copy here.
-- order_json holds the complete order exactly as stored in KV, so nothing about the
-- order shape changes. The other columns exist only to make listing/filtering fast.
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  created_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  fulfillment TEXT NOT NULL DEFAULT 'new',
  paid_at TEXT,
  price_toman INTEGER,
  sandbox INTEGER NOT NULL DEFAULT 0 CHECK (sandbox IN (0, 1)),
  customer_phone TEXT,
  user_id TEXT,
  track_id TEXT,
  order_json TEXT NOT NULL,
  mirrored_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders(status, fulfillment);
CREATE INDEX IF NOT EXISTS orders_user_idx ON orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_phone_idx ON orders(customer_phone);
