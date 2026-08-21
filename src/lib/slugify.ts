/**
 * Convert a display name into a URL-safe slug.
 * "John Doe" → "john-doe"
 * "Ahmed ibn Omar" → "ahmed-ibn-omar"
 * "Mary-Jane" → "mary-jane"
 */
export function slugifyName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // remove special characters except spaces and hyphens
    .replace(/\s+/g, "-") // spaces → hyphens
    .replace(/-+/g, "-") // collapse multiple hyphens
    .replace(/^-|-$/g, "") // trim leading/trailing hyphens
    .slice(0, 50); // cap at 50 chars
}
