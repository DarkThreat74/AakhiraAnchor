-- Drop dead/unused tables and enums
-- These features were never built or have been removed from the product.

DROP TABLE IF EXISTS "onboarding_responses" CASCADE;
DROP TABLE IF EXISTS "daily_lesson_views" CASCADE;
DROP TABLE IF EXISTS "daily_lessons" CASCADE;
DROP TABLE IF EXISTS "huddle_completions" CASCADE;
DROP TABLE IF EXISTS "huddle_task_pool" CASCADE;
DROP TABLE IF EXISTS "oath_ledger" CASCADE;
DROP TABLE IF EXISTS "oath_settings" CASCADE;

-- Drop unused enums
DROP TYPE IF EXISTS "oath_status" CASCADE;
