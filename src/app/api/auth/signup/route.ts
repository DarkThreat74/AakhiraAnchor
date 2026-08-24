import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { setSessionCookie } from "@/lib/auth/session";
import { isValidEmail, isHoneypotTripped, isTimeTrapTripped } from "@/lib/validation";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
  // ── Rate limit: 5 signup attempts per 15 min per IP ──
  const ip = getClientIp(request.headers);
  if (!checkRateLimit("signup", ip, 5, 15 * 60 * 1000)) {
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

  const { email, password, website, company, renderedAt } = body as {
    email?: string;
    password?: string;
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

  // ── Validate password ──
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

  // ── Check if user already exists ──
  const existing = await db
    .select({ id: schema.users.id })
    .from(schema.users)
    .where(eq(schema.users.email, normalizedEmail))
    .limit(1);

  if (existing.length > 0) {
    return NextResponse.json(
      { error: "An account with this email already exists." },
      { status: 409 },
    );
  }

  // ── Create user ──
  const passwordHash = await bcrypt.hash(password, 10);

  // Generate a unique 6-character prayer code for friend sharing
  let prayerCode = "";
  let codeAttempts = 0;
  while (codeAttempts < 10) {
    prayerCode = generatePrayerCode();
    const [existingCode] = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.prayerCode, prayerCode))
      .limit(1);
    if (!existingCode) break;
    codeAttempts++;
  }

  const [user] = await db
    .insert(schema.users)
    .values({ email: normalizedEmail, passwordHash, prayerCode })
    .returning({ id: schema.users.id, email: schema.users.email });

  if (!user) {
    return NextResponse.json(
      { error: "An error occurred while creating your account." },
      { status: 500 },
    );
  }

  // ── Set session ──
  await setSessionCookie(user);

  return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 },
    );
  }
}

// Generate a random 6-character prayer code (uppercase letters + digits, no ambiguous chars)
function generatePrayerCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
