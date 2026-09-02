/**
 * Shared input validation helpers.
 * See CODEBASE_PATTERNS.md §1 (Input Validation).
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TOKEN_RE = /^[A-Za-z0-9_-]{1,128}$/;
const FINGERPRINT_HASH_RE = /^[0-9a-f]{64}$/;

export function isValidUUID(str: string): boolean {
  return UUID_RE.test(str);
}

export function isValidEmail(str: string): boolean {
  return EMAIL_RE.test(str);
}

export function isValidToken(str: string): boolean {
  return TOKEN_RE.test(str);
}

/**
 * Validate a SHA-256 fingerprint hash (64 lowercase hex chars).
 * Prevents non-hex strings from reaching DB queries.
 */
export function isValidFingerprintHash(str: string): boolean {
  return FINGERPRINT_HASH_RE.test(str);
}

/**
 * Normalize a phone number to digits-only.
 * Returns null if the input doesn't look like a valid phone number.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10) return digits;
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  return null;
}

/**
 * Convert a US phone number to E.164 format.
 */
export function toE164(input: string): string | null {
  const normalized = normalizePhone(input);
  return normalized ? `+1${normalized}` : null;
}

/**
 * XSS prevention for HTML insertion contexts.
 */
export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Honeypot validation — detects bots that fill hidden fields.
 * Returns true if the request looks like a bot (honeypot tripped).
 *
 * @param fields - hidden honeypot field values from the form
 * @returns true if any honeypot field is filled (bot detected)
 */
export function isHoneypotTripped(fields: Record<string, unknown>): boolean {
  return Object.values(fields).some((v) => typeof v === "string" && v.trim().length > 0);
}

/**
 * Time-trap validation — detects bots that submit forms too fast.
 * The form embeds a rendered timestamp; if the submission arrives
 * in under `minSeconds`, it's likely a bot.
 *
 * Missing or invalid renderedAt is treated as suspicious (bot omitted it).
 *
 * @param renderedAt - timestamp (ms) when the form was rendered, sent from client
 * @param minSeconds - minimum human-readable time expected (default 2s)
 * @returns true if the submission is suspiciously fast
 */
export function isTimeTrapTripped(renderedAt: number | undefined, minSeconds = 2): boolean {
  if (!renderedAt || typeof renderedAt !== 'number') return true;
  const elapsed = (Date.now() - renderedAt) / 1000;
  return elapsed < minSeconds;
}
