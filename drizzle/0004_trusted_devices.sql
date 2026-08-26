-- ─── Trusted Devices (FingerprintJS) ───
CREATE TABLE IF NOT EXISTS "trusted_devices" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "fingerprint_hash" text NOT NULL,
  "label" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "last_used_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- One device per user (prevents duplicate entries)
CREATE UNIQUE INDEX IF NOT EXISTS "trusted_devices_user_hash_idx"
  ON "trusted_devices" ("user_id", "fingerprint_hash");
