// Intentionally free of the `server-only` guard and of server-only imports:
// the limiter is pure logic with a unit test. `next/headers` is loaded lazily
// inside `clientIp`, which is the only part that needs a request context.

/**
 * Fixed-window rate limiter held in process memory.
 *
 * Deliberately dependency-free. It protects a single application instance; if
 * the site is ever scaled to several instances behind a load balancer, move
 * this to a shared store (see docs/DEPLOYMENT.md).
 */
type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 60_000) return;
  lastSweep = now;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt < now) buckets.delete(key);
  }
}

export type RateLimitResult = { ok: boolean; retryAfterSeconds: number };

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  sweep(now);

  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSeconds: 0 };
  }

  bucket.count += 1;
  if (bucket.count > limit) {
    return { ok: false, retryAfterSeconds: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  return { ok: true, retryAfterSeconds: 0 };
}

/** Best-effort client IP. Only trusts proxy headers when TRUST_PROXY is set. */
export async function clientIp(): Promise<string> {
  const { headers } = await import("next/headers");
  const h = await headers();
  if (process.env.TRUST_PROXY === "1") {
    const forwarded = h.get("x-forwarded-for");
    const first = forwarded?.split(",")[0]?.trim();
    if (first) return first;
    const real = h.get("x-real-ip");
    if (real) return real.trim();
  }
  return "unknown";
}

/** Clears all buckets. Test helper only. */
export function __resetRateLimits() {
  buckets.clear();
}
