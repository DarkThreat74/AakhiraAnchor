import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  // Verify sunnah_log table
  const t = await sql`SELECT table_name FROM information_schema.tables WHERE table_name = 'sunnah_log'`;
  console.log("sunnah_log table exists:", t.length > 0);

  const c = await sql`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sunnah_log' ORDER BY ordinal_position`;
  console.log("Columns:", c.map((r) => `${r.column_name}:${r.data_type}`).join(", "));

  const i = await sql`SELECT indexname FROM pg_indexes WHERE tablename = 'sunnah_log'`;
  console.log("Indexes:", i.map((r) => r.indexname).join(", "));

  // Check prayer_settings madhab
  const s = await sql`SELECT user_id, madhab FROM prayer_settings LIMIT 10`;
  console.log("Settings rows:", s.length);
  for (const r of s) console.log("  madhab:", r.madhab);

  // Update null madhabs to 'standard'
  const u = await sql`UPDATE prayer_settings SET madhab = 'standard' WHERE madhab IS NULL RETURNING user_id`;
  console.log("Updated null madhabs:", u.length);

  console.log("Verification complete!");
}

run().catch((e) => console.error(e.message)).finally(() => process.exit(0));
