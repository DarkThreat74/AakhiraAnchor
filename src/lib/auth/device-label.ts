import 'server-only';
import { UAParser } from 'ua-parser-js';

/**
 * Parse a User-Agent string into a human-readable device label.
 * Examples:
 *   "Windows · Chrome" → "Windows · Chrome"
 *   "iPhone · Safari" → "iPhone · Safari"
 *   "Android · Chrome" → "Android · Chrome"
 *   "Mac OS · Safari" → "Mac OS · Safari"
 */
export function getDeviceLabel(userAgent: string | null | undefined): string | null {
  if (!userAgent) return null;

  try {
    const parser = new UAParser(userAgent);
    const result = parser.getResult();

    const parts: string[] = [];

    // OS name (e.g. "Windows", "iOS", "Android", "Mac OS")
    if (result.os.name) {
      // For iOS, try to get a more specific device model
      if (result.os.name === 'iOS') {
        parts.push('iPhone');
      } else {
        parts.push(result.os.name);
      }
    }

    // Device model (if available — mostly for Android phones)
    if (result.device.model && result.device.model !== 'iPhone') {
      // Android devices often have model names like "SM-G950F"
      parts.push(result.device.model);
    }

    // Browser name (e.g. "Chrome", "Safari", "Firefox")
    if (result.browser.name) {
      parts.push(result.browser.name);
    }

    if (parts.length === 0) return null;

    return parts.join(' · ');
  } catch {
    return null;
  }
}
