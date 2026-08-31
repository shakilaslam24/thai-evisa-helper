'use strict';
/**
 * A small in-memory rate limiter.
 *
 * In memory rather than in the database because the counters are worthless after
 * a restart anyway, and because the whole system is deliberately one process on
 * one machine. If it is ever run as several processes, each keeps its own count
 * and the effective limit multiplies — see the note in docs/OPERATIONS.md.
 */

/**
 * @param {object} opts
 * @param {number} opts.windowMs   how long a bucket lasts
 * @param {number} opts.max        attempts allowed inside one window
 * @param {function} opts.keyOf    what to count per — an IP, an email, a pair
 * @param {string} opts.message    what the caller is told, with {minutes}
 * @param {boolean} [opts.onlyCountFailures]  when true, call `succeeded(req)` on
 *        a good outcome and that attempt is refunded
 */
function rateLimiter({ windowMs, max, keyOf, message, onlyCountFailures = false }) {
  const buckets = new Map();

  // Occasional sweep so the map cannot grow without bound.
  setInterval(() => {
    const now = Date.now();
    for (const [k, b] of buckets) if (now > b.resetAt) buckets.delete(k);
  }, windowMs).unref();

  const bucketFor = (req) => {
    const key = keyOf(req);
    const now = Date.now();
    let b = buckets.get(key);
    if (!b || now > b.resetAt) {
      b = { count: 0, resetAt: now + windowMs };
      buckets.set(key, b);
    }
    return b;
  };

  const middleware = (req, res, next) => {
    const b = bucketFor(req);
    if (b.count >= max) {
      const minutes = Math.max(1, Math.ceil((b.resetAt - Date.now()) / 60000));
      res.setHeader('Retry-After', String(Math.ceil((b.resetAt - Date.now()) / 1000)));
      return res.status(429).json({ error: message.replace('{minutes}', String(minutes)) });
    }
    b.count += 1;
    next();
  };

  /** Refund the attempt when it turned out to be legitimate. */
  middleware.succeeded = (req) => {
    if (!onlyCountFailures) return;
    const b = buckets.get(keyOf(req));
    if (b && b.count > 0) b.count -= 1;
  };

  /* ---- imperative use, for callers that must check the outcome first ---- */

  /** Is this key already over its limit? Counts nothing. */
  middleware.isBlocked = (req) => {
    const key = keyOf(req);
    const b = buckets.get(key);
    return Boolean(b && Date.now() <= b.resetAt && b.count >= max);
  };

  middleware.minutesLeft = (req) => {
    const b = buckets.get(keyOf(req));
    if (!b) return 1;
    return Math.max(1, Math.ceil((b.resetAt - Date.now()) / 60000));
  };

  middleware.messageFor = (req) => message.replace('{minutes}', String(middleware.minutesLeft(req)));

  /** Record one bad attempt against this key. */
  middleware.countFailure = (req) => { bucketFor(req).count += 1; };

  /** Forget this key entirely — used when the right password finally arrives. */
  middleware.clear = (req) => { buckets.delete(keyOf(req)); };

  middleware.reset = () => buckets.clear();
  return middleware;
}

/**
 * The client address to count against.
 *
 * Express only trusts X-Forwarded-For when `trust proxy` is on, which this
 * system enables only when TRUST_PROXY says a reverse proxy is really in front
 * of it. Without that, req.ip is the socket address and cannot be forged by
 * sending a header.
 */
const clientIp = (req) => req.ip || req.socket?.remoteAddress || 'unknown';

module.exports = { rateLimiter, clientIp };
