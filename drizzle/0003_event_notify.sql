-- Add `notify` column to events table.
-- Allows per-event push notification toggle (15 min before event).
-- Defaults to true so existing events remain notified.
ALTER TABLE "events" ADD COLUMN "notify" boolean NOT NULL DEFAULT true;
