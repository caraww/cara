-- Verified-purchase reviews for gallery works.
-- A review is only accepted when the signed-in user has a paid order that contains
-- the same work ID. Public reads only expose approved rows and a display name.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'خریدار کارا',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (work_id, user_id, order_id)
);

CREATE INDEX IF NOT EXISTS reviews_public_idx
  ON reviews(work_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS reviews_status_idx
  ON reviews(status, created_at DESC);
