import { NextRequest, NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth/session";
import { logError } from "@/lib/logError";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    if (!checkRateLimit("logout", ip, 10, 15 * 60 * 1000)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    await clearSessionCookie();
    return NextResponse.json({ ok: true });
  } catch (err) {
    logError(err, { route: "auth/logout" });
    return NextResponse.json({ error: "Failed to log out." }, { status: 500 });
  }
}
