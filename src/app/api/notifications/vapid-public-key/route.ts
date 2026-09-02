import { NextResponse } from "next/server";
import { publicEnv } from "@/lib/env.public";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

// GET — return VAPID public key (safe to expose to client)
export async function GET() {
  // Prefer the NEXT_PUBLIC_ var (inlined at build time), fall back to server var
  const publicKey = publicEnv.vapidPublicKey || env.vapidPublicKey;
  if (!publicKey) {
    return NextResponse.json({ error: "Push not configured" }, { status: 503 });
  }
  return NextResponse.json({ publicKey });
}
