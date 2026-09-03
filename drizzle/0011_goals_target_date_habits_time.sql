-- 0011: Add target_date to goals + time_of_day/reminder_time to habits
-- Allows Today tab to show goals approaching their deadline and group habits by time of day

-- Goals: optional target date for when the goal should be achieved by
ALTER TABLE "goals" ADD COLUMN IF NOT EXISTS "target_date" date;

-- Index for filtering goals by target date (Today tab: goals due this week)
CREATE INDEX IF NOT EXISTS "goals_user_target_date_idx" ON "goals" ("user_id", "target_date");

-- Habits: optional time-of-day grouping (morning | afternoon | evening | night)
ALTER TABLE "habits" ADD COLUMN IF NOT EXISTS "time_of_day" text;

-- Habits: optional specific reminder time (e.g., "07:00")
ALTER TABLE "habits" ADD COLUMN IF NOT EXISTS "reminder_time" text;
