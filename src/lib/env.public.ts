/**
 * Client-safe environment variables.
 * Only put vars here that are safe to expose in the browser bundle.
 * NEVER put secrets, service role keys, or API keys here.
 */

export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  aladhanBaseUrl: process.env.NEXT_PUBLIC_ALADHAN_BASE_URL ?? 'https://api.aladhan.com/v1',
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
  turnstileSiteKey: process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '',
  // When "false", the signup page uses playcaptcha instead of Turnstile.
  // Defaults to false so the app never gets stuck on a broken Turnstile config.
  // Set to "true" ONLY when BOTH NEXT_PUBLIC_TURNSTILE_SITE_KEY and
  // TURNSTILE_SECRET_KEY are configured.
  turnstileEnabled: process.env.NEXT_PUBLIC_TURNSTILE_ENABLED === 'true',
} as const;
