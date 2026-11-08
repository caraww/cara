-- Customer contact details and explicit SMS marketing preferences.
-- Phone numbers are collected separately from Telegram identity; changing a number
-- clears verification and requires fresh consent for that new number.
ALTER TABLE user_profiles ADD COLUMN phone TEXT;
ALTER TABLE user_profiles ADD COLUMN phone_verified_at INTEGER;
ALTER TABLE user_profiles ADD COLUMN marketing_sms_consent INTEGER NOT NULL DEFAULT 0
  CHECK (marketing_sms_consent IN (0, 1));
ALTER TABLE user_profiles ADD COLUMN marketing_sms_consent_at INTEGER;
ALTER TABLE user_profiles ADD COLUMN marketing_sms_revoked_at INTEGER;

CREATE INDEX IF NOT EXISTS user_profiles_marketing_sms_idx
  ON user_profiles(marketing_sms_consent, phone_verified_at);
