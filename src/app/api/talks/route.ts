import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { logError } from "@/lib/logError";

export const dynamic = "force-dynamic";

/**
 * GET /api/talks
 * Returns all talks ordered by most recently added.
 * These are external links only — never self-hosted audio.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const talks = await db
      .select()
      .from(schema.talks)
      .orderBy(schema.talks.addedAt);

    return NextResponse.json({ talks });
  } catch (err) {
    logError(err, { route: "talks GET" });
    return NextResponse.json(
      { error: "Failed to load talks." },
      { status: 500 },
    );
  }
}
