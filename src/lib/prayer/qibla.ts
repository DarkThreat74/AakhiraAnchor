/**
 * Qibla direction calculation utilities.
 *
 * The Qibla is the direction of the Kaaba in Mecca from the user's location.
 * We use the great-circle bearing formula (spherical trigonometry).
 *
 * Kaaba coordinates: 21.4225°N, 39.8262°E
 */

export const KAABA_LAT = 21.4225;
export const KAABA_LNG = 39.8262;

const toRad = (deg: number): number => (deg * Math.PI) / 180;
const toDeg = (rad: number): number => (rad * 180) / Math.PI;

/**
 * Calculate the Qibla bearing (degrees clockwise from North) from a given location.
 *
 * Uses the great-circle initial bearing formula:
 *   θ = atan2(sin(Δλ)·cos(φ₂), cos(φ₁)·sin(φ₂) − sin(φ₁)·cos(φ₂)·cos(Δλ))
 *
 * @param userLat User's latitude in degrees
 * @param userLng User's longitude in degrees
 * @returns Bearing in degrees (0-360, clockwise from North)
 */
export function calculateQiblaBearing(userLat: number, userLng: number): number {
  const φ1 = toRad(userLat);
  const φ2 = toRad(KAABA_LAT);
  const Δλ = toRad(KAABA_LNG - userLng);

  const x = Math.sin(Δλ) * Math.cos(φ2);
  const y = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const bearing = toDeg(Math.atan2(x, y));
  return (bearing + 360) % 360;
}

/**
 * Calculate the great-circle distance between two points using the Haversine formula.
 *
 * @param userLat User's latitude in degrees
 * @param userLng User's longitude in degrees
 * @returns Distance in kilometers
 */
export function calculateDistance(userLat: number, userLng: number): number {
  const R = 6371; // Earth's radius in km
  const φ1 = toRad(userLat);
  const φ2 = toRad(KAABA_LAT);
  const Δφ = toRad(KAABA_LAT - userLat);
  const Δλ = toRad(KAABA_LNG - userLng);

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

/**
 * Convert a bearing (0-360°) to a cardinal direction label.
 *
 * @param bearing Degrees clockwise from North
 * @returns Cardinal label like "N", "NNE", "NE", "ENE", "E", etc.
 */
export function bearingToCardinal(bearing: number): string {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const idx = Math.round(bearing / 22.5) % 16;
  return dirs[idx];
}
