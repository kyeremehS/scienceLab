/**
 * Minimal in-memory sliding-window rate limiter for auth endpoints
 * (FR-AUTH-01 request throttling).
 *
 * Single-instance only: sufficient for the MVP's ~100-user target (CR-08).
 * A distributed limiter replaces this if the app ever scales horizontally.
 */
const windows = new Map<string, number[]>();

export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = (windows.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    windows.set(key, hits);
    return true;
  }
  hits.push(now);
  windows.set(key, hits);
  return false;
}

/** For tests only. */
export function clearRateLimits(): void {
  windows.clear();
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return "unknown";
}
