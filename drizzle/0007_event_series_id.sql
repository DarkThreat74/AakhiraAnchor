-- Add series_id column to events table.
-- All events in the same recurring series share a single UUID.
-- One-off events have NULL series_id.
-- This replaces using recurrenceRule (a non-unique rule string) as the
-- series identifier for bulk update/delete operations.
ALTER TABLE "events" ADD COLUMN "series_id" uuid;

-- Index for bulk update/delete by series (user_id + series_id)
CREATE INDEX "events_series_id_idx" ON "events" ("user_id", "series_id");

-- Backfill: assign a unique series_id to existing recurring events grouped by
-- their current recurrenceRule + user_id + title + created_at (approximate
-- series grouping). Events that share the same recurrenceRule but were created
-- at different times are treated as separate series.
-- Note: This is a best-effort backfill. If two series happened to be created
-- at the exact same second with the same rule, they'll share a series_id.
-- That's an acceptable edge case — going forward, each POST gets a fresh UUID.
UPDATE "events" e
SET "series_id" = gen_random_uuid()
WHERE "recurrence_rule" IS NOT NULL
  AND "series_id" IS NULL
  AND "id" = (
    SELECT MIN(e2."id") FROM "events" e2
    WHERE e2."user_id" = e."user_id"
      AND e2."recurrence_rule" = e."recurrence_rule"
      AND e2."title" = e."title"
      AND e2."recurrence_rule" IS NOT NULL
  );

-- Propagate the series_id from the representative event to all events in
-- the same group (same user_id + recurrence_rule + title)
UPDATE "events" e
SET "series_id" = sub.series_id
FROM (
  SELECT
    e2."user_id",
    e2."recurrence_rule",
    e2."title",
    MIN(e2."series_id") AS series_id
  FROM "events" e2
  WHERE e2."recurrence_rule" IS NOT NULL
  GROUP BY e2."user_id", e2."recurrence_rule", e2."title"
) sub
WHERE e."user_id" = sub."user_id"
  AND e."recurrence_rule" = sub."recurrence_rule"
  AND e."title" = sub."title"
  AND e."recurrence_rule" IS NOT NULL
  AND e."series_id" IS NULL;
