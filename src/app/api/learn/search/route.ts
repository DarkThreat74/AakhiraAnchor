import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { learnSections } from "@/lib/content/learn";

export const dynamic = "force-dynamic";

// Rate limiting: 20 searches per hour per user+IP.
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour

const MAX_QUERY_LENGTH = 200;

// Build a compact index of all sections for the AI to match against.
// The AI only sees section IDs, titles, subtitles, and keywords — never the full content.
// This ensures it can only return IDs that exist in our curated corpus.
interface SectionIndexEntry {
  id: string;
  title: string;
  subtitle: string;
  keywords: string[];
}

const sectionIndex: SectionIndexEntry[] = learnSections.map((s) => ({
  id: s.id,
  title: s.title,
  subtitle: s.subtitle,
  keywords: extractKeywords(s),
}));

function extractKeywords(section: typeof learnSections[number]): string[] {
  const keywords: string[] = [];
  for (const block of section.content) {
    if (block.type === "heading") {
      keywords.push(block.text);
    }
    if (block.type === "paragraph") {
      // Extract key phrases from paragraphs (first sentence only, to keep it compact)
      const firstSentence = block.text.split(".")[0];
      if (firstSentence.length > 10 && firstSentence.length < 100) {
        keywords.push(firstSentence.trim());
      }
    }
  }
  return keywords.slice(0, 10); // Limit to keep the prompt small
}

// Simple keyword matching against curated learn sections
function keywordMatch(query: string): string[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .map((w) => w.replace(/[^a-z]/g, ""));

  const scored = sectionIndex.map((s) => {
    const haystack = `${s.title} ${s.subtitle} ${s.keywords.join(" ")}`.toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      if (haystack.includes(word)) score += 1;
    }
    // Bonus for title match
    if (s.title.toLowerCase().includes(queryLower)) score += 5;
    return { id: s.id, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((s) => s.id);
}

// POST /api/learn/search — keyword search of curated learn content
export async function POST(request: NextRequest) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit by both user ID and IP (defense in depth)
  const ip = getClientIp(request.headers);
  const rateLimitKey = `${session.userId}:${ip}`;
  if (!checkRateLimit("learn-search", rateLimitKey, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW)) {
    return NextResponse.json(
      {
        error: "Search rate limit reached. Please try again later.",
        retryAfterMs: RATE_LIMIT_WINDOW,
      },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const { query } = body as { query?: string };
  if (!query || typeof query !== "string") {
    return NextResponse.json({ error: "Missing query." }, { status: 400 });
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length === 0) {
    return NextResponse.json({ error: "Empty query." }, { status: 400 });
  }
  if (trimmedQuery.length > MAX_QUERY_LENGTH) {
    return NextResponse.json(
      { error: `Query too long. Maximum ${MAX_QUERY_LENGTH} characters.` },
      { status: 400 },
    );
  }

  // Keyword-based search (no AI — human-curated content only)
  const sectionIds = keywordMatch(trimmedQuery);
  return NextResponse.json({
    sectionIds,
    matched: sectionIds.length > 0,
    method: "keyword",
  });
}
