export function logError(err: unknown, context?: Record<string, unknown>): void {
  const message = err instanceof Error ? err.message : "Unknown error";
  console.error("[Waqt]", { message, context });
}
