-- Reviews that any visitor can submit without an account.
-- Guest rows stay pending until an admin approves them, and are kept separate
-- from verified-purchase reviews so the existing ownership constraints stay intact.
CREATE TABLE IF NOT EXISTS guest_reviews (
  id TEXT PRIMARY KEY,
  work_id TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body TEXT NOT NULL,
  author_name TEXT NOT NULL DEFAULT 'مهمان کارا',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS guest_reviews_public_idx
  ON guest_reviews(work_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS guest_reviews_status_idx
  ON guest_reviews(status, created_at DESC);
