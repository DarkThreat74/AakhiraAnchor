import 'server-only';
import { env } from '@/lib/env';

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

// Cloudflare's test secret key — always passes verification (for dev only)
const TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';

interface SiteverifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

/**
 * Verify a Cloudflare Turnstile token server-side.
 * This is the authoritative check — never trust client-side verification alone.
 *
 * @param token - The Turnstile token from the client widget (cf-turnstile-response)
 * @param remoteip - The client's IP address (optional, improves accuracy)
 * @param expectedAction - The action string to validate (optional, e.g. "signup")
 * @returns true if the token is valid, false otherwise
 */
export async function verifyTurnstileToken(
  token: string | undefined | null,
  remoteip?: string,
  expectedAction?: string,
): Promise<boolean> {
  if (!token || typeof token !== 'string') {
    return false;
  }

  // If no secret key is configured:
  // - In development: use Cloudflare's test secret key (always passes)
  // - In production: accept the playcaptcha fallback token, or allow if no
  //   token at all (relying on other security measures: fingerprint, honeypot,
  //   rate limiting, time-trap). Once the secret key is configured, full
  //   Turnstile verification is enforced automatically.
  if (!env.turnstileSecretKey) {
    if (!env.isProduction) {
      // Use test secret key for dev — always passes
      try {
        const body = new URLSearchParams();
        body.append('secret', TEST_SECRET_KEY);
        body.append('response', token);
        if (remoteip) body.append('remoteip', remoteip);

        const res = await fetch(TURNSTILE_VERIFY_URL, {
          method: 'POST',
          body,
          signal: AbortSignal.timeout(10000),
        });

        if (!res.ok) return false;
        const data: SiteverifyResponse = await res.json();
        return data.success === true;
      } catch {
        // If even the test secret fails (network issue), allow in dev
        return true;
      }
    }
    // Production without secret key: accept playcaptcha token, or allow
    // (other security layers still apply: rate limit, honeypot, time-trap, fingerprint)
    if (token === 'playcaptcha-verified') {
      return true;
    }
    console.warn('[turnstile] TURNSTILE_SECRET_KEY not configured in production. Relying on other security measures. Set the secret key to enable full Turnstile verification.');
    return true;
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

    const data: SiteverifyResponse = await res.json();
    if (!data.success) {
      console.warn('[turnstile] Verification failed:', data['error-codes'] || []);
      return false;
    }

    // Defense in depth: validate action if expected
    if (expectedAction && data.action && data.action !== expectedAction) {
      console.warn(`[turnstile] Action mismatch: expected "${expectedAction}", got "${data.action}"`);
      return false;
    }

    return true;
  } catch (err) {
    console.error('[turnstile] Verification request failed:', err);
    return false;
  }
}
