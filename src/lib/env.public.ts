/**
 * Client-safe environment variables.
 * Only put vars here that are safe to expose in the browser bundle.
 * NEVER put secrets, service role keys, or API keys here.
 */

export const publicEnv = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  aladhanBaseUrl: process.env.NEXT_PUBLIC_ALADHAN_BASE_URL ?? 'https://api.aladhan.com/v1',
  vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '',
} as const;
