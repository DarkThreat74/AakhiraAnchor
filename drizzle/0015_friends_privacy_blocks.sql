-- Friends privacy controls + block list
-- Adds visibility toggles to prayer_settings so users can control what
-- friends see, and a prayer_blocks table to prevent unwanted re-requests.

-- Add visibility columns to prayer_settings (defaults: streak visible, today's
-- detailed per-prayer status hidden by default — privacy-preserving).
ALTER TABLE "prayer_settings"
  ADD COLUMN IF NOT EXISTS "friends_see_streak" boolean DEFAULT true NOT NULL,
  ADD COLUMN IF NOT EXISTS "friends_see_today_status" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "friends_see_sunnah" boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS "friends_see_masjid_pct" boolean DEFAULT true NOT NULL;

-- Block list — prevents a user from sending or receiving requests to/from
-- a blocked user.
CREATE TABLE IF NOT EXISTS "prayer_blocks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "blocked_user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  UNIQUE ("user_id", "blocked_user_id")
);

CREATE INDEX IF NOT EXISTS "prayer_blocks_user_idx" ON "prayer_blocks" ("user_id");
