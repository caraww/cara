-- Cross-device wishlist for signed-in customers.
CREATE TABLE IF NOT EXISTS user_favorites (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  work_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, work_id)
);

CREATE INDEX IF NOT EXISTS user_favorites_user_idx
  ON user_favorites(user_id, created_at DESC);
