/**
 * Tell the service worker to clear the API cache.
 * Call this after any successful API write (POST/PATCH/PUT/DELETE)
 * so the next GET fetches fresh data instead of serving stale cache.
 */
export function clearApiCache() {
  if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "CLEAR_API_CACHE" });
  }
}
