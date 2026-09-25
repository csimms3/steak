// In-memory fixed-window rate limiter, keyed by an arbitrary string (usually
// client IP). Process-local on purpose: fine for a single instance, but each
// instance keeps its own counts, so N instances allow N× the limit. Move to a
// shared store (Postgres/Redis) before scaling out.

interface Window {
  count: number;
  resetAt: number;
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

// Past this many tracked keys, expired windows are swept on the next check so
// a stream of distinct IPs can't grow the map without bound.
const SWEEP_THRESHOLD = 10_000;

export function createRateLimiter({
  limit,
  windowMs,
  now = Date.now,
}: {
  limit: number;
  windowMs: number;
  now?: () => number;
}): RateLimiter {
  const windows = new Map<string, Window>();

  return {
    check(key) {
      const t = now();
      if (windows.size > SWEEP_THRESHOLD) {
        for (const [k, w] of windows) if (w.resetAt <= t) windows.delete(k);
      }

      let w = windows.get(key);
      if (!w || w.resetAt <= t) {
        w = { count: 0, resetAt: t + windowMs };
        windows.set(key, w);
      }
      w.count++;
      return w.count <= limit ? { ok: true, retryAfterMs: 0 } : { ok: false, retryAfterMs: w.resetAt - t };
    },
  };
}

// Client IP from proxy headers. Takes the *last* X-Forwarded-For entry: proxies
// append the address they saw, so earlier entries are client-controlled and
// spoofable, while the last one was added by the nearest (trusted) proxy.
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  const last = forwarded?.split(",").at(-1)?.trim();
  return last || headers.get("x-real-ip")?.trim() || "unknown";
}

// bcrypt at cost 12 makes both of these a cheap CPU DoS on a small instance.
export const registerLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });
export const loginLimiter = createRateLimiter({ limit: 10, windowMs: 5 * 60 * 1000 });
