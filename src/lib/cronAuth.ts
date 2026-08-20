import crypto from 'node:crypto';
import { env } from '@/lib/env';

/**
 * Verify cron job requests using a Bearer token with timing-safe comparison.
 * See CODEBASE_PATTERNS.md §1 (Cron Authentication).
 */
export function verifyCronAuth(
  authHeader: string | null,
  isVercelCron = false,
): boolean {
  const cronSecret = env.cronSecret;

  if (cronSecret && authHeader) {
    const expected = `Bearer ${cronSecret}`;
    if (authHeader.length === expected.length) {
      try {
        return crypto.timingSafeEqual(
          Buffer.from(authHeader),
          Buffer.from(expected),
        );
      } catch {
        return false;
      }
    }
  }

  // Vercel cron bypass (dev only — no secret configured)
  if (!cronSecret && isVercelCron && !env.isProduction) {
    return true;
  }

  return false;
}
