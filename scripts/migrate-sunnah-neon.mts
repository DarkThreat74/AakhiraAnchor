import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  try {
    console.log("Connecting to Neon...");

    // 1. Check if madhab column exists in prayer_settings
    const cols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'prayer_settings' AND column_name = 'madhab'
    `;
    console.log("madhab column exists:", cols.length > 0);

    if (cols.length === 0) {
      console.log("Adding madhab column to prayer_settings...");
      await sql`ALTER TABLE prayer_settings ADD COLUMN IF NOT EXISTS madhab text DEFAULT 'standard'`;
      console.log("madhab column added.");
    }

    // 2. Create sunnah_log table
    console.log("Creating sunnah_log table...");
    await sql`
      CREATE TABLE IF NOT EXISTS sunnah_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        date date NOT NULL,
        sunnah_key text NOT NULL,
        associated_fard text NOT NULL,
        prayed boolean DEFAULT false NOT NULL,
        logged_at timestamp with time zone
      )
    `;
    console.log("sunnah_log table created.");

    // 3. Create unique index
    console.log("Creating unique index...");
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS sunnah_log_user_date_key_idx
      ON sunnah_log (user_id, date, sunnah_key)
    `;
    console.log("Index created.");

    // 4. Verify
    const sunnahCols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'sunnah_log' ORDER BY ordinal_position
    `;
    console.log("sunnah_log columns:", sunnahCols.map((r) => r.column_name).join(", "));

    const count = await sql`SELECT COUNT(*)::int as count FROM sunnah_log`;
    console.log("sunnah_log row count:", count[0].count);

    // 5. Check that existing users have madhab set
    const settingsRows = await sql`
      SELECT id, madhab FROM prayer_settings LIMIT 10
    `;
    console.log("Existing prayer_settings rows:", settingsRows.length);
    for (const row of settingsRows) {
      console.log(`  - settings ${row.id}: madhab = ${row.madhab || "(null)"}`);
    }

    // 6. Set default madhab for any existing rows where it's null
    const updated = await sql`
      UPDATE prayer_settings SET madhab = 'standard' WHERE madhab IS NULL
    `;
    console.log("Updated null madhab rows:", Array.isArray(updated) ? updated.length : "done");

    console.log("\nMigration complete!");
  } catch (e) {
    console.error("Error:", e instanceof Error ? e.message : String(e));
    process.exitCode = 1;
  }
}

run();
