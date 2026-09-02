import { NextRequest, NextResponse } from "next/server";
import { getSessionFromRequest } from "@/lib/auth/session";
import { getClientIp, checkRateLimit } from "@/lib/rateLimit";
import { env } from "@/lib/env";
import { logError } from "@/lib/logError";
import { learnSections } from "@/lib/content/learn";

export const dynamic = "force-dynamic";

// Aggressive rate limiting: 10 searches per hour per user+IP.
// This prevents abuse and controls OpenRouter costs.
const RATE_LIMIT_MAX = 10;
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

// Simple keyword matching fallback (used when OpenRouter is unavailable or key is missing)
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

interface OpenRouterResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  error?: { message: string };
}

async function openRouterSearch(query: string): Promise<string[]> {
  const systemPrompt = `You are a search assistant for an Islamic prayer education app. Your job is to match the user's question to the most relevant section IDs from the provided list. You MUST ONLY return section IDs from the list below — never invent IDs, never answer the question yourself, never provide religious rulings.

Available sections:
${JSON.stringify(sectionIndex, null, 2)}

Return ONLY a JSON array of section IDs (maximum 3), ordered by relevance. Example: ["wudu-and-ghusl", "common-mistakes"]
If no section is relevant, return: []`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://waqt.app",
      "X-Title": "Waqt Learn Search",
    },
    body: JSON.stringify({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: query },
      ],
      max_tokens: 100,
      temperature: 0,
    }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter API error: ${response.status}`);
  }

  const data: OpenRouterResponse = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) return [];

  // Parse the JSON array from the response
  // The model should return just a JSON array, but be defensive
  const jsonMatch = content.match(/\[[\s\S]*\]/);
  if (!jsonMatch) return [];

  try {
    const ids = JSON.parse(jsonMatch[0]) as string[];
    // Validate that all returned IDs actually exist in our corpus
    const validIds = new Set(sectionIndex.map((s) => s.id));
    return ids.filter((id) => validIds.has(id)).slice(0, 3);
  } catch {
    return [];
  }
}

// POST /api/learn/search — AI-assisted search of curated learn content
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

  // If OpenRouter key is not configured, fall back to keyword matching
  if (!env.openRouterApiKey) {
    const sectionIds = keywordMatch(trimmedQuery);
    return NextResponse.json({
      sectionIds,
      matched: sectionIds.length > 0,
      method: "keyword",
    });
  }

  // Try OpenRouter AI search, fall back to keyword matching on error
  try {
    const sectionIds = await openRouterSearch(trimmedQuery);
    return NextResponse.json({
      sectionIds,
      matched: sectionIds.length > 0,
      method: "ai",
    });
  } catch (err) {
    logError(err, { route: "learn/search" });
    const sectionIds = keywordMatch(trimmedQuery);
    return NextResponse.json({
      sectionIds,
      matched: sectionIds.length > 0,
      method: "keyword-fallback",
    });
  }
}
