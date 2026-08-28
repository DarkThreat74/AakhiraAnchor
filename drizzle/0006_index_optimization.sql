-- ─── Index optimization for 10k+ users ───
-- All indexes use CONCURRENTLY where possible to avoid locking.
-- Note: Drizzle migrations run in transactions, so CONCURRENTLY won't work
-- inside the migration runner. Run these manually on production if the
-- table is large, or let Drizzle run them (it will use regular CREATE INDEX
-- which is fine for tables under ~1M rows).
--
-- Index strategy:
-- 1. Composite B-tree indexes for hot query paths (equality → range order)
-- 2. BRIN indexes for append-only time-series tables (100-1000x smaller)
-- 3. Single-column indexes for FK lookups that are queried independently
-- 4. Partial indexes for queries that always filter on a status

-- ─── 1. events table — CRITICAL: no indexes existed ───
-- Hot path: calendar day/month view queries WHERE user_id = $1 AND start_at BETWEEN $2 AND $3
-- Composite index with equality (user_id) first, range (start_at) second
CREATE INDEX "events_user_start_idx" ON "events" ("user_id", "start_at");

-- Also index notified_at for the event notification cron (finds unnotified events)
-- Partial index: only rows where notify=true AND notified_at IS NULL
CREATE INDEX "events_pending_notify_idx" ON "events" ("start_at")
  WHERE "notify" = true AND "notified_at" IS NULL;

-- BRIN index on start_at for range scans across all users (append-only pattern)
-- 100-1000x smaller than B-tree, ideal for time-series data
CREATE INDEX "events_start_at_brin_idx" ON "events" USING BRIN ("start_at")
  WITH (autosummarize = on);

-- ─── 2. push_subscriptions — was missing user_id index ───
-- Hot path: cron fetches all subs for a user to send push notifications
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions" ("user_id");

-- ─── 3. goal_share_tokens — was missing user_id index ───
-- Query: SELECT ... WHERE user_id = $1 (list/revoke share tokens)
CREATE INDEX "goal_share_tokens_user_id_idx" ON "goal_share_tokens" ("user_id");

-- ─── 4. qadaa_log_entries — was missing user_id index ───
-- Query: SELECT ... WHERE user_id = $1 ORDER BY logged_at DESC
CREATE INDEX "qadaa_log_entries_user_id_idx" ON "qadaa_log_entries" ("user_id");

-- ─── 5. prayer_log — additional indexes for analytics ───
-- The unique index (user_id, date, prayer_name) covers point lookups.
-- But analytics queries filter on user_id + date range + status.
-- Add a partial index for "prayed" status (most analytics queries filter on this).
CREATE INDEX "prayer_log_user_date_prayed_idx" ON "prayer_log" ("user_id", "date")
  WHERE "status" IN ('prayed', 'assumed_prayed');

-- BRIN index on date for the cron's range scans (append-only, ordered by date)
CREATE INDEX "prayer_log_date_brin_idx" ON "prayer_log" USING BRIN ("date")
  WITH (autosummarize = on);

-- ─── 6. prayer_times_cache — additional index for batch fetch ───
-- The unique index (user_id, date) covers single-day lookups.
-- But the analytics route fetches a range: WHERE user_id = $1 AND date >= $2
-- The unique index handles this, but a BRIN on date helps the cron's
-- "fetch all rows for a date across all users" pattern.
CREATE INDEX "prayer_times_cache_date_brin_idx" ON "prayer_times_cache" USING BRIN ("date")
  WITH (autosummarize = on);

-- ─── 7. goals — composite index for the list query ───
-- Query: SELECT ... WHERE user_id = $1 ORDER BY sort_order, created_at
-- The existing user_id index works but requires a sort step.
-- This composite index eliminates the sort.
CREATE INDEX "goals_user_sort_created_idx" ON "goals" ("user_id", "sort_order", "created_at");

-- ─── 8. sunnah_log — additional index for date range queries ───
-- The unique index (user_id, date, sunnah_key) covers point lookups.
-- Add a partial index for prayed=true (dashboard queries filter on this).
CREATE INDEX "sunnah_log_user_date_prayed_idx" ON "sunnah_log" ("user_id", "date")
  WHERE "prayed" = true;

-- ─── 9. trusted_devices — index on fingerprint_hash for lookup ───
-- The unique index (user_id, fingerprint_hash) covers the combined lookup.
-- But the login flow sometimes queries by fingerprint_hash alone when
-- checking if a device is trusted across users (rare but possible).
-- Skip — the composite index is sufficient for all current queries.

-- ─── 10. events — index on user_id + notified_at for notification cleanup ───
-- Helps the cron find events that need notifications sent
CREATE INDEX "events_user_notified_idx" ON "events" ("user_id", "notified_at");
