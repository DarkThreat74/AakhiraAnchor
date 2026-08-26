import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { setSessionCookie } from "@/lib/auth/session";
import { isValidEmail, isHoneypotTripped, isTimeTrapTripped } from "@/lib/validation";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
  // ── Rate limit: 5 login attempts per 15 min per IP ──
  const ip = getClientIp(request.headers);
  if (!checkRateLimit("login", ip, 5, 15 * 60 * 1000)) {
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

  const { email, password, fingerprintHash, website, company, renderedAt } = body as {
    email?: string; password?: string; fingerprintHash?: string;
    website?: string; company?: string; renderedAt?: number;
  };

  // ── Honeypot check — if filled, reject as bot ──
  if (isHoneypotTripped({ website, company })) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  // ── Time-trap — bots submit in <2s ──
  // Note: renderedAt = -1 means the client hasn't mounted yet (useEffect hasn't run).
  // Treat -1 as valid (not a bot) to avoid false positives on fast connections.
  if (renderedAt !== undefined && renderedAt !== -1 && isTimeTrapTripped(renderedAt, 2)) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  const normalizedEmail = email?.trim().toLowerCase();
  if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  // ── Look up user ──
  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, normalizedEmail))
    .limit(1);

  if (!user) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  // ── Trusted device check ──
  // If a fingerprint hash is provided and matches a trusted device,
  // allow login without a password.
  if (fingerprintHash && typeof fingerprintHash === "string" && fingerprintHash.length === 64) {
    const [trusted] = await db
      .select()
      .from(schema.trustedDevices)
      .where(and(
        eq(schema.trustedDevices.userId, user.id),
        eq(schema.trustedDevices.fingerprintHash, fingerprintHash),
      ))
      .limit(1);

    if (trusted) {
      // Update lastUsedAt
      await db
        .update(schema.trustedDevices)
        .set({ lastUsedAt: new Date() })
        .where(eq(schema.trustedDevices.id, trusted.id));

      await setSessionCookie({ id: user.id, email: user.email });
      return NextResponse.json({ ok: true, trustedDevice: true });
    }
  }

  // ── Password verification ──
  if (!password) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  if (!(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json(
      { error: "Invalid email or password." },
      { status: 401 },
    );
  }

  // ── Set session ──
  await setSessionCookie({ id: user.id, email: user.email });

  // ── Trust this device if fingerprint provided ──
  // (only after successful password login — this is how devices get trusted)
  if (fingerprintHash && typeof fingerprintHash === "string" && fingerprintHash.length === 64) {
    // Check if already trusted to avoid unique constraint violation
    const [existing] = await db
      .select({ id: schema.trustedDevices.id })
      .from(schema.trustedDevices)
      .where(and(
        eq(schema.trustedDevices.userId, user.id),
        eq(schema.trustedDevices.fingerprintHash, fingerprintHash),
      ))
      .limit(1);

    if (!existing) {
      await db.insert(schema.trustedDevices).values({
        userId: user.id,
        fingerprintHash,
      });
    } else {
      // Update lastUsedAt
      await db
        .update(schema.trustedDevices)
        .set({ lastUsedAt: new Date() })
        .where(eq(schema.trustedDevices.id, existing.id));
    }
  }

  return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 },
    );
  }
}
