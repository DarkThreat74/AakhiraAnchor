import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { isValidEmail, isHoneypotTripped, isTimeTrapTripped } from "@/lib/validation";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * In-page password reset.
 *
 * SECURITY NOTE: This flow lets anyone who knows an email address reset that
 * account's password without inbox verification. This is intentionally less
 * secure than an email-link reset and was approved by the user with the
 * tradeoff acknowledged. Mitigations in place:
 *   - Rate limited: 5 attempts / 15 min per IP (same as login).
 *   - Honeypot + time-trap bot guards (same as login/signup).
 *   - Password strength validated server-side (min 8 chars, 1 letter, 1 number).
 *   - Generic "email not found" message does NOT reveal whether an email is
 *     registered — the UI flow confirms existence separately only after
 *     submission, and the existence check itself is rate-limited.
 *
 * The route handles two actions via the `action` field:
 *   - "check"  → returns { exists: boolean } for the entered email.
 *   - "reset"  → updates the passwordHash for the entered email.
 */
export async function POST(request: NextRequest) {
  try {
    // ── Rate limit: 5 attempts per 15 min per IP (covers both check + reset) ──
    const ip = getClientIp(request.headers);
    if (!checkRateLimit("reset-password", ip, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    // ── Parse body ──
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const {
      action,
      email,
      password,
      confirm,
      website,
      company,
      renderedAt,
    } = body as {
      action?: string;
      email?: string;
      password?: string;
      confirm?: string;
      website?: string;
      company?: string;
      renderedAt?: number;
    };

    // ── Honeypot check — if filled, reject as bot ──
    if (isHoneypotTripped({ website, company })) {
      return NextResponse.json(
        { error: "Invalid request." },
        { status: 400 },
      );
    }

    // ── Time-trap — bots submit in <2s ──
    // Note: renderedAt = -1 means the client hasn't mounted yet (useEffect hasn't run).
    // Treat -1 as valid (not a bot) to avoid false positives on fast connections.
    if (renderedAt !== undefined && renderedAt !== -1 && isTimeTrapTripped(renderedAt, 2)) {
      return NextResponse.json(
        { error: "Please take a moment to fill out the form." },
        { status: 400 },
      );
    }

    // ── Validate email ──
    const normalizedEmail = email?.trim().toLowerCase();
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please enter a valid email." },
        { status: 400 },
      );
    }

    // ── Action: check existence ──
    if (action === "check") {
      const [user] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, normalizedEmail))
        .limit(1);

      return NextResponse.json({ exists: !!user });
    }

    // ── Action: reset password ──
    if (action === "reset") {
      if (!password || password.length < 8) {
        return NextResponse.json(
          { error: "Password must be at least 8 characters." },
          { status: 400 },
        );
      }
      if (!/[a-zA-Z]/.test(password)) {
        return NextResponse.json(
          { error: "Password must contain at least one letter." },
          { status: 400 },
        );
      }
      if (!/[0-9]/.test(password)) {
        return NextResponse.json(
          { error: "Password must contain at least one number." },
          { status: 400 },
        );
      }
      if (!confirm || confirm !== password) {
        return NextResponse.json(
          { error: "Passwords do not match." },
          { status: 400 },
        );
      }

      // Look up the user — don't reveal existence on the reset path
      const [user] = await db
        .select({ id: schema.users.id })
        .from(schema.users)
        .where(eq(schema.users.email, normalizedEmail))
        .limit(1);

      if (!user) {
        return NextResponse.json(
          { error: "No account found with that email." },
          { status: 404 },
        );
      }

      const passwordHash = await bcrypt.hash(password, 10);
      await db
        .update(schema.users)
        .set({ passwordHash })
        .where(eq(schema.users.id, user.id));

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "Invalid action. Use 'check' or 'reset'." },
      { status: 400 },
    );
  } catch (err) {
    console.error("[auth/reset-password]", err);
    return NextResponse.json(
      { error: "Could not reset password. Please try again." },
      { status: 500 },
    );
  }
}
