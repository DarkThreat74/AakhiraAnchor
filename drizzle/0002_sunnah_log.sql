-- Sunnah log table for tracking sunnah/nafl prayers
CREATE TABLE IF NOT EXISTS "sunnah_log" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "sunnah_key" text NOT NULL,
  "associated_fard" "prayer_name" NOT NULL,
  "prayed" boolean DEFAULT false NOT NULL,
  "logged_at" timestamp with time zone
);

-- Unique index: one entry per user per date per sunnah key
CREATE UNIQUE INDEX IF NOT EXISTS "sunnah_log_user_date_key_idx" ON "sunnah_log" ("user_id", "date", "sunnah_key");
