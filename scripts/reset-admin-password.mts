/**
 * Reset a user's password and optionally grant admin role.
 *
 * Usage:
 *   pnpm exec tsx scripts/reset-admin-password.mts <email> <newPassword>
 *
 * If the user with the given email exists:
 *   - Updates their password hash.
 *   - Sets role = 'admin' (so they can log in at /admin/login).
 *
 * If the user does NOT exist:
 *   - Creates a new admin user with the given email + password.
 *
 * Requires DATABASE_URL in the environment (load .env first).
 * Run from the project root:
 *   pnpm exec tsx --env-file=.env scripts/reset-admin-password.mts you@example.com yourNewPassword
 *
 * If you don't have tsx installed, use:
 *   pnpm exec node --experimental-strip-types --env-file=.env scripts/reset-admin-password.mts you@example.com yourNewPassword
 */
import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";

async function run() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: tsx scripts/reset-admin-password.mts <email> <newPassword>");
    console.error("Example: tsx --env-file=.env scripts/reset-admin-password.mts admin@example.com mySecret123");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("Password must be at least 8 characters.");
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const sql = neon(process.env.DATABASE_URL!);

  // Check if the user exists
  const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`;

  const passwordHash = await bcrypt.hash(password, 10);

  if (existing.length > 0) {
    // Update existing user: reset password + grant admin
    await sql`
      UPDATE users
      SET password_hash = ${passwordHash}, role = 'admin'
      WHERE email = ${normalizedEmail}
    `;
    console.log(`✓ Updated password and granted admin role to: ${normalizedEmail}`);
    console.log("  You can now log in at /admin/login with this email + the new password.");
  } else {
    // Create a new admin user
    await sql`
      INSERT INTO users (email, password_hash, role, onboarding_completed)
      VALUES (${normalizedEmail}, ${passwordHash}, 'admin', true)
    `;
    console.log(`✓ Created new admin user: ${normalizedEmail}`);
    console.log("  You can now log in at /admin/login with this email + the new password.");
  }
}

run().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
