import assert from "node:assert/strict";
import { describe, it, beforeEach } from "node:test";
import { rateLimit, __resetRateLimits } from "../src/lib/rate-limit.ts";

describe("rate limiting", () => {
  beforeEach(() => __resetRateLimits());

  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i += 1) {
      assert.equal(rateLimit("key", 5, 60_000).ok, true, `request ${i + 1} should pass`);
    }
  });

  it("blocks the request after the limit and reports a retry delay", () => {
    for (let i = 0; i < 5; i += 1) rateLimit("key", 5, 60_000);
    const blocked = rateLimit("key", 5, 60_000);
    assert.equal(blocked.ok, false);
    assert.ok(blocked.retryAfterSeconds > 0);
  });

  it("keeps separate buckets per key", () => {
    for (let i = 0; i < 5; i += 1) rateLimit("a", 5, 60_000);
    assert.equal(rateLimit("a", 5, 60_000).ok, false);
    assert.equal(rateLimit("b", 5, 60_000).ok, true);
  });

  it("opens the window again once it has elapsed", () => {
    for (let i = 0; i < 3; i += 1) rateLimit("key", 3, 1);
    // A 1ms window has certainly passed by the next tick.
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        assert.equal(rateLimit("key", 3, 1).ok, true);
        resolve();
      }, 15);
    });
  });
});
