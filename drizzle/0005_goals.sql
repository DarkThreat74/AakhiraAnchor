-- Goals table: hierarchical goals with parent-child relationships
CREATE TABLE "goals" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "parent_id" uuid,
  "title" text NOT NULL,
  "description" text,
  "status" text DEFAULT 'active' NOT NULL,
  "sort_order" integer DEFAULT 0 NOT NULL,
  "color" text,
  "created_at" timestamptz DEFAULT now() NOT NULL,
  "updated_at" timestamptz DEFAULT now() NOT NULL,
  "completed_at" timestamptz
);

-- Self-referencing FK with cascade delete (added separately for clarity)
ALTER TABLE "goals" ADD CONSTRAINT "goals_parent_id_fk"
  FOREIGN KEY ("parent_id") REFERENCES "goals"("id") ON DELETE CASCADE;

-- Goal share tokens: public read-only sharing
CREATE TABLE "goal_share_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token" text UNIQUE NOT NULL,
  "created_at" timestamptz DEFAULT now() NOT NULL
);

-- Index for querying goals by user
CREATE INDEX "goals_user_id_idx" ON "goals" ("user_id");
-- Index for querying children of a goal
CREATE INDEX "goals_parent_id_idx" ON "goals" ("parent_id");
