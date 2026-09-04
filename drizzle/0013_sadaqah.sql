-- Sadaqah tracker table
CREATE TABLE IF NOT EXISTS "sadaqah_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "amount" numeric(10, 2) NOT NULL,
  "currency" text DEFAULT 'USD' NOT NULL,
  "category" text NOT NULL,
  "note" text,
  "date" date NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);
CREATE INDEX IF NOT EXISTS "sadaqah_logs_user_id_idx" ON "sadaqah_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "sadaqah_logs_user_date_idx" ON "sadaqah_logs" ("user_id", "date");
