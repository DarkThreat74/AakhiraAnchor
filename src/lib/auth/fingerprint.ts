"use client";

import FingerprintJS from "@fingerprintjs/fingerprintjs";

let cachedVisitorId: string | null = null;

/**
 * Get the FingerprintJS visitor ID (a stable device identifier).
 * Cached after first call — the library caches internally too, but this
 * avoids re-initializing the agent.
 */
export async function getFingerprint(): Promise<string> {
  if (cachedVisitorId) return cachedVisitorId;

  const agent = await FingerprintJS.load();
  const result = await agent.get();
  cachedVisitorId = result.visitorId;
  return cachedVisitorId;
}

/**
 * Hash a string using SHA-256 (Web Crypto API).
 * Used to hash the fingerprint before sending to the server,
 * so the raw fingerprint never leaves the device.
 */
export async function hashFingerprint(visitorId: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(visitorId);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Get the hashed fingerprint — the only form that should be sent to the server.
 */
export async function getHashedFingerprint(): Promise<string> {
  const visitorId = await getFingerprint();
  return hashFingerprint(visitorId);
}
