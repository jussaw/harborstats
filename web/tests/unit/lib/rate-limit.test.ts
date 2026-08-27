import { beforeEach, describe, expect, it } from 'vitest';
import {
  checkRateLimit,
  clearRateLimit,
  rateLimitBucketCount,
  RATE_LIMIT_MAX_BUCKETS,
  resetRateLimit,
} from '@/lib/rate-limit';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

describe('rate-limit', () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it('allows up to the threshold then blocks further attempts', () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      expect(checkRateLimit('key', now).allowed).toBe(true);
    }

    const blocked = checkRateLimit('key', now);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(WINDOW_MS);
  });

  it('reports a shrinking retryAfterMs as the window elapses', () => {
    const start = 1_000_000;
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      checkRateLimit('key', start);
    }

    const blocked = checkRateLimit('key', start + 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(WINDOW_MS - 60_000);
  });

  it('resets once the window has fully elapsed', () => {
    const start = 1_000_000;
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      checkRateLimit('key', start);
    }
    expect(checkRateLimit('key', start).allowed).toBe(false);

    expect(checkRateLimit('key', start + WINDOW_MS).allowed).toBe(true);
  });

  it('tracks each key independently', () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      checkRateLimit('a', now);
    }

    expect(checkRateLimit('a', now).allowed).toBe(false);
    expect(checkRateLimit('b', now).allowed).toBe(true);
  });

  it('clearRateLimit refunds the full budget for that key only', () => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      checkRateLimit('a', now);
      checkRateLimit('b', now);
    }

    clearRateLimit('a');

    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      expect(checkRateLimit('a', now).allowed).toBe(true);
    }
    expect(checkRateLimit('a', now).allowed).toBe(false);
    expect(checkRateLimit('b', now).allowed).toBe(false);
  });

  it('sweeps expired buckets once the map grows past the threshold', () => {
    const start = 1_000_000;
    for (let i = 0; i < 1000; i += 1) {
      checkRateLimit(`spoofed-${i}`, start);
    }

    // All earlier windows have elapsed; the next attempt triggers the sweep,
    // leaving only the new key behind.
    const later = start + WINDOW_MS;
    expect(checkRateLimit('fresh', later).allowed).toBe(true);

    // Indirect size check: expired keys were dropped, so each re-added old key
    // starts a brand-new window rather than continuing a stale one.
    const blocked = checkRateLimit('spoofed-0', later + 1);
    expect(blocked.allowed).toBe(true);
    expect(checkRateLimit('spoofed-0', later + 1).retryAfterMs).toBeUndefined();
  });

  it('keeps live buckets when sweeping', () => {
    const start = 1_000_000;
    for (let i = 0; i < MAX_ATTEMPTS; i += 1) {
      checkRateLimit('live', start);
    }
    for (let i = 0; i < 1000; i += 1) {
      checkRateLimit(`spoofed-${i}`, start);
    }

    // Sweep triggers mid-window: the live key's exhausted budget must survive.
    expect(checkRateLimit('live', start + 1).allowed).toBe(false);
  });

  it('caps the map at the ceiling under a flood of unhelpfully-unique keys', () => {
    const now = 1_000_000;
    // All within one window, so nothing is sweepable — the ceiling must engage.
    const flood = RATE_LIMIT_MAX_BUCKETS * 2;
    for (let i = 0; i < flood; i += 1) {
      checkRateLimit(`spoofed-${i}`, now);
    }

    expect(rateLimitBucketCount()).toBeLessThanOrEqual(RATE_LIMIT_MAX_BUCKETS);
  });

  it(
    'handles a flood of unique keys at one timestamp in linear time',
    () => {
      const now = 1_000_000;
      const start = performance.now();
      for (let i = 0; i < 20_000; i += 1) {
        checkRateLimit(`spoofed-${i}`, now);
      }
      const elapsed = performance.now() - start;

      expect(elapsed).toBeLessThan(2000);
      expect(rateLimitBucketCount()).toBeLessThanOrEqual(RATE_LIMIT_MAX_BUCKETS);
    },
    60_000,
  );

  it('evicts the least-exhausted (latest-to-expire) windows first at the ceiling', () => {
    // The ceiling engages by dropping 10% of the map down to the low-water mark.
    const evicted = RATE_LIMIT_MAX_BUCKETS - Math.floor(RATE_LIMIT_MAX_BUCKETS * 0.9);

    // Fill most of the map with OLD windows (soonest resetAt) — the most-
    // exhausted, and the ones we want to keep. One is exhausted so we can prove
    // it survived with its blocking state intact.
    const old = 1_000_000;
    const oldCount = RATE_LIMIT_MAX_BUCKETS - evicted;
    for (let i = 0; i < oldCount; i += 1) {
      checkRateLimit(`old-${i}`, old);
    }
    for (let i = 0; i < MAX_ATTEMPTS - 1; i += 1) {
      checkRateLimit('old-0', old);
    }
    expect(checkRateLimit('old-0', old).allowed).toBe(false);

    // Top the map off to exactly the ceiling with FRESH windows (latest resetAt)
    // — the least-exhausted, and the ones eviction should target. Exhaust one so
    // that, if it is wrongly retained, it would still read as blocked.
    const fresh = old + 60_000;
    for (let i = 0; i < evicted; i += 1) {
      checkRateLimit(`fresh-${i}`, fresh);
    }
    for (let i = 0; i < MAX_ATTEMPTS - 1; i += 1) {
      checkRateLimit('fresh-0', fresh);
    }
    expect(rateLimitBucketCount()).toBe(RATE_LIMIT_MAX_BUCKETS);

    // A brand-new key at the ceiling triggers a batch eviction of the fresh
    // (latest-to-expire) windows before it is inserted.
    checkRateLimit('trigger', fresh);
    expect(rateLimitBucketCount()).toBeLessThanOrEqual(RATE_LIMIT_MAX_BUCKETS);

    // The old, most-exhausted window survived: still blocking mid-window.
    expect(checkRateLimit('old-0', fresh).allowed).toBe(false);
    // The fresh, least-exhausted window was evicted: re-checking it starts a
    // brand-new window rather than continuing the exhausted one.
    const reFresh = checkRateLimit('fresh-0', fresh);
    expect(reFresh.allowed).toBe(true);
    expect(reFresh.retryAfterMs).toBeUndefined();
  });
});
