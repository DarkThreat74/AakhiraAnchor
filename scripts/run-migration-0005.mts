import { neon } from "@neondatabase/serverless";

// Load .env manually
import { readFileSync } from "fs";
import { join } from "path";

const envPath = join(process.cwd(), ".env");
const envContent = readFileSync(envPath, "utf-8");
for (const line of envContent.split("\n")) {
  const match = line.match(/^([A-Z_]+)=(.*)$/);
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  try {
    console.log("Connecting to Neon...");
    console.log("Running migration 0005_goals.sql...");

    // Create goals table
    console.log("Creating goals table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "goals" (
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
      )
    `;
    console.log("goals table created.");

    // Add self-referencing FK (if not exists)
    console.log("Adding goals_parent_id_fk constraint...");
    await sql`
      DO $$ BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'goals_parent_id_fk') THEN
          ALTER TABLE "goals" ADD CONSTRAINT "goals_parent_id_fk"
            FOREIGN KEY ("parent_id") REFERENCES "goals"("id") ON DELETE CASCADE;
        END IF;
      END $$;
    `;
    console.log("FK constraint added.");

    // Create goal_share_tokens table
    console.log("Creating goal_share_tokens table...");
    await sql`
      CREATE TABLE IF NOT EXISTS "goal_share_tokens" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "token" text UNIQUE NOT NULL,
        "created_at" timestamptz DEFAULT now() NOT NULL
      )
    `;
    console.log("goal_share_tokens table created.");

    // Create indexes
    console.log("Creating indexes...");
    await sql`CREATE INDEX IF NOT EXISTS "goals_user_id_idx" ON "goals" ("user_id")`;
    await sql`CREATE INDEX IF NOT EXISTS "goals_parent_id_idx" ON "goals" ("parent_id")`;
    console.log("Indexes created.");

    // Verify
    const goalsCols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'goals' ORDER BY ordinal_position
    `;
    console.log("goals columns:", goalsCols.map((c: Record<string, unknown>) => String(c.column_name)).join(", "));

    const shareCols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'goal_share_tokens' ORDER BY ordinal_position
    `;
    console.log("goal_share_tokens columns:", shareCols.map((c: Record<string, unknown>) => String(c.column_name)).join(", "));

    console.log("\nMigration 0005 complete!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

run();
