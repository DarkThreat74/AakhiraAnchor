-- 0010_goals_habits_notes.sql
-- Adds goal_type column, habits + habit_logs + notes tables for the unified Goals page.

-- ─── Add goal_type column to goals table ───
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "goal_type" text NOT NULL DEFAULT 'short_term';

-- Index for filtering goals by type (long-term vs short-term tabs)
CREATE INDEX IF NOT EXISTS "goals_user_type_idx" ON "goals" ("user_id", "goal_type");

-- ─── Habits ───
DO $$ BEGIN
  CREATE TYPE "habit_frequency" AS ENUM('daily', 'weekly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "habits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "description" text,
  "frequency" "habit_frequency" DEFAULT 'daily' NOT NULL,
  "color" text DEFAULT '#c2410c' NOT NULL,
  "target_count" integer DEFAULT 1 NOT NULL,
  "archived" boolean DEFAULT false NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "habits_user_id_idx" ON "habits" ("user_id");

-- ─── Habit logs (completion tracking) ───
CREATE TABLE IF NOT EXISTS "habit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "habit_id" uuid NOT NULL REFERENCES "habits"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "count" integer DEFAULT 1 NOT NULL,
  "completed_at" timestamptz DEFAULT now() NOT NULL
);

-- One log per habit per date (prevents duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS "habit_logs_user_habit_date_idx"
  ON "habit_logs" ("user_id", "habit_id", "date");

-- Query all habit completions for a user on a specific date
CREATE INDEX IF NOT EXISTS "habit_logs_user_date_idx"
  ON "habit_logs" ("user_id", "date");

-- ─── Notes (brain dump / journal) ───
CREATE TABLE IF NOT EXISTS "notes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "title" text,
  "content" text NOT NULL DEFAULT '',
  "pinned" boolean DEFAULT false NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "notes_user_id_idx" ON "notes" ("user_id");
CREATE INDEX IF NOT EXISTS "notes_user_updated_idx" ON "notes" ("user_id", "updated_at");
