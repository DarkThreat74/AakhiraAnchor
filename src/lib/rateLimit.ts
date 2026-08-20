/**
 * IP-based rate limiting with secure IP extraction.
 * In-memory fixed-window algorithm.
 * See CODEBASE_PATTERNS.md §30 (Rate Limiting — The Complete Method).
 *
 * NOTE: In-memory storage resets on serverless cold starts. For auth endpoints,
 * add a DB-backed lockout as a second layer (defense in depth).
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMaps = new Map<string, Map<string, RateLimitEntry>>();

// Prune expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const map of rateLimitMaps.values()) {
      for (const [key, entry] of map) {
        if (now >= entry.resetAt) map.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

/**
 * Extract the client IP securely.
 * Prioritizes infrastructure-set headers over client-controlled ones.
 * Uses the LAST value in X-Forwarded-For (set by trusted proxy), NOT the first
 * (which clients can spoof).
 */
export function getClientIp(headers: Headers): string {
  // 1. Vercel's dedicated IP header — cannot be spoofed
  const vercelIp = headers.get('x-vercel-ip');
  if (vercelIp) return vercelIp.trim();

  // 2. x-real-ip — set by trusted reverse proxies
  const realIp = headers.get('x-real-ip');
  if (realIp) return realIp.trim();

  // 3. X-Forwarded-For — take the FIRST value (original client IP)
  // The first value is the leftmost = original client.
  // Trusted proxies strip client-provided XFF headers before appending.
  const xff = headers.get('x-forwarded-for');
  if (xff) {
    const parts = xff.split(',').map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[0];
  }

  return 'unknown';
}

/**
 * Check if a request is allowed under the rate limit.
 * Returns true if allowed, false if rate-limited.
 *
 * @param namespace - Logical group (e.g. 'login', 'signup', 'api-events')
 * @param key - Usually IP address, or user ID for authenticated endpoints
 * @param maxRequests - Maximum requests allowed in the window
 * @param windowMs - Window duration in milliseconds
 */
export function checkRateLimit(
  namespace: string,
  key: string,
  maxRequests: number,
  windowMs: number,
): boolean {
  let map = rateLimitMaps.get(namespace);
  if (!map) {
    map = new Map();
    rateLimitMaps.set(namespace, map);
  }

  const compositeKey = `${namespace}:${key}`;
  const now = Date.now();
  const entry = map.get(compositeKey);

  if (entry && now < entry.resetAt) {
    if (entry.count >= maxRequests) return false;
    entry.count++;
  } else {
    map.set(compositeKey, { count: 1, resetAt: now + windowMs });
  }

  return true;
}
