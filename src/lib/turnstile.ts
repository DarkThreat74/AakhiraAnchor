import 'server-only';
import { env } from '@/lib/env';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * Verify a Cloudflare Turnstile token server-side.
 * This is the authoritative check — never trust client-side verification alone.
 *
 * @param token - The Turnstile token from the client widget (cf-turnstile-response)
 * @param remoteip - The client's IP address (optional, improves accuracy)
 * @returns true if the token is valid, false otherwise
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteip?: string,
): Promise<boolean> {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // In development with test keys, Turnstile returns a dummy token.
  // Cloudflare's test site key (1x00000000000000000000AA) always passes.
  // If the secret key is not configured, skip verification in non-production.
  if (!env.turnstileSecretKey) {
    if (!env.isProduction) return true;
    console.error('[turnstile] Missing TURNSTILE_SECRET_KEY in production — rejecting signup.');
    return false;
  }

  try {
    const body = new URLSearchParams();
    body.append('secret', env.turnstileSecretKey);
    body.append('response', token);
    if (remoteip) body.append('remoteip', remoteip);

    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body,
      // Cloudflare's siteverify endpoint is fast and reliable
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      console.error('[turnstile] siteverify returned non-OK status:', res.status);
      return false;
    }

    const data: { success: boolean; 'error-codes'?: string[] } = await res.json();
    if (!data.success) {
      console.warn('[turnstile] Verification failed:', data['error-codes'] || []);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[turnstile] Verification request failed:', err);
    return false;
  }
}
