import webpush, { type RequestOptions } from "web-push";
import { env } from "@/lib/env";

/**
 * Configure web-push VAPID details once at module load.
 * Calling setVapidDetails multiple times is harmless but wasteful —
 * doing it at module scope avoids repeating it in every request handler.
 *
 * If VAPID keys are not configured (e.g. local dev without push), this is a no-op
 * and sendNotification will throw a clear error when actually called.
 */
let configured = false;

export function ensureVapidConfigured() {
  if (configured) return;
  if (!env.vapidPublicKey || !env.vapidPrivateKey) return;
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
  configured = true;
}

/**
 * Standard push options for time-sensitive prayer notifications.
 * - TTL: 24h so the message survives device offline windows
 * - urgency: 'high' so the device wakes to deliver
 * - topic: groups notifications so a newer one supersedes an older one
 */
export const PRAYER_PUSH_OPTIONS: RequestOptions = {
  TTL: 24 * 60 * 60, // 24 hours in seconds
  urgency: "high",
  // topic is set per-call by the caller via headers
};

/**
 * Send a push notification to a single subscription, with proper TTL/urgency.
 * Cleans up expired subscriptions (404/410) by returning a flag.
 */
export async function sendPrayerPush(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  options?: { topic?: string },
): Promise<{ delivered: boolean; expired: boolean }> {
  ensureVapidConfigured();

  const pushOptions: RequestOptions = {
    TTL: PRAYER_PUSH_OPTIONS.TTL,
    urgency: PRAYER_PUSH_OPTIONS.urgency,
  };
  if (options?.topic) {
    pushOptions.headers = { Topic: options.topic };
  }

  try {
    await webpush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      payload,
      pushOptions,
    );
    return { delivered: true, expired: false };
  } catch (err) {
    const e = err as { statusCode?: number };
    if (e.statusCode === 404 || e.statusCode === 410) {
      return { delivered: false, expired: true };
    }
    throw err;
  }
}
