-- Add missing columns to users table:
--   first_name  — used in prayer friends dashboard (never migrated)
--   prayer_code — 6-character prayer share code (never migrated)
-- Both columns are nullable so existing rows are unaffected.
ALTER TABLE "users" ADD COLUMN "first_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "prayer_code" text;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_prayer_code_unique" UNIQUE("prayer_code");
