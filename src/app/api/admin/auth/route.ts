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
    const ip = getClientIp(request.headers);
    if (!checkRateLimit("admin-login", ip, 5, 15 * 60 * 1000)) {
      return NextResponse.json(
        { error: "Too many attempts. Please try again later." },
        { status: 429 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid request." }, { status: 400 });
    }

    const { email, password, website, company, renderedAt } = body as {
      email?: string; password?: string;
      website?: string; company?: string; renderedAt?: number;
    };

    // ── Honeypot check — if filled, silently pretend success (bot trap) ──
    if (isHoneypotTripped({ website, company })) {
      return NextResponse.json({ ok: true });
    }

    // ── Time-trap — bots submit in <2s, humans can't type that fast ──
    if (isTimeTrapTripped(renderedAt, 2)) {
      return NextResponse.json({ ok: true });
    }

    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !isValidEmail(normalizedEmail) || !password) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, normalizedEmail))
      .limit(1);

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 },
      );
    }

    if (user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied." },
        { status: 403 },
      );
    }

    await setSessionCookie({ id: user.id, email: user.email });

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json(
      { error: `Server error: ${message}` },
      { status: 500 },
    );
  }
}
