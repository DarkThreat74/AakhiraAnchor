import { NextRequest, NextResponse } from "next/server";
import { eq, asc, desc, isNull } from "drizzle-orm";
import { db, schema } from "@/lib/db/client";
import { getSessionFromRequest } from "@/lib/auth/session";
import { logError } from "@/lib/logError";
import { getStreamUrl } from "@/lib/r2/client";

export const dynamic = "force-dynamic";

/**
 * GET /api/talks
 * Returns folders + talks. Self-hosted talks get a presigned stream URL.
 */
export async function GET(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [folders, talks] = await Promise.all([
      db.select().from(schema.talkFolders).orderBy(asc(schema.talkFolders.sortOrder), asc(schema.talkFolders.name)),
      db.select().from(schema.talks).orderBy(desc(schema.talks.addedAt)),
    ]);

    // Generate presigned stream URLs for self-hosted talks
    const talksWithUrls = await Promise.all(
      talks.map(async (talk) => {
        if (talk.storageKey) {
          try {
            const streamUrl = await getStreamUrl(talk.storageKey);
            return { ...talk, streamUrl };
          } catch {
            return { ...talk, streamUrl: null };
          }
        }
        return { ...talk, streamUrl: null };
      }),
    );

    return NextResponse.json({ folders, talks: talksWithUrls });
  } catch (err) {
    logError(err, { route: "talks GET" });
    return NextResponse.json(
      { error: "Failed to load talks." },
      { status: 500 },
    );
  }
}

// Avoid unused import warning
void isNull;
void eq;
