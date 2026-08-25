import { neon } from "@neondatabase/serverless";

const sql = neon(process.env.DATABASE_URL!);

async function run() {
  const rows = await sql`
    SELECT user_id, calculation_method, madhab, latitude, longitude, timezone
    FROM prayer_settings
  `;
  console.log("Prayer settings:");
  for (const r of rows) {
    console.log(`  user: ${r.user_id}`);
    console.log(`    method: ${r.calculation_method}`);
    console.log(`    madhab: ${r.madhab}`);
    console.log(`    lat: ${r.latitude}, lng: ${r.longitude}`);
    console.log(`    tz: ${r.timezone}`);
  }

  // Also check cached prayer times for today
  const today = new Date().toLocaleDateString("en-CA");
  const cached = await sql`
    SELECT user_id, date, fajr, sunrise, dhuhr, asr, maghrib, isha
    FROM prayer_times_cache
    WHERE date = ${today}
  `;
  console.log("\nCached times for today:", today);
  for (const r of cached) {
    console.log(`  user: ${r.user_id}`);
    console.log(`    Fajr: ${r.fajr}, Sunrise: ${r.sunrise}, Dhuhr: ${r.dhuhr}`);
    console.log(`    Asr: ${r.asr}, Maghrib: ${r.maghrib}, Isha: ${r.isha}`);
  }
}

run().catch((e) => console.error(e.message)).finally(() => process.exit(0));
