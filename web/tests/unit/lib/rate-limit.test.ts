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

  it('evicts the soonest-to-expire windows first when at the ceiling', () => {
    // Fill exactly to the ceiling with windows that expire soonest.
    const early = 1_000_000;
    for (let i = 0; i < RATE_LIMIT_MAX_BUCKETS; i += 1) {
      checkRateLimit(`early-${i}`, early);
    }

    // A newer key (later resetAt) arrives once the map is full; it forces the
    // eviction of an earlier, soonest-to-expire window rather than itself.
    const later = early + 60_000;
    checkRateLimit('newcomer', later);

    expect(rateLimitBucketCount()).toBeLessThanOrEqual(RATE_LIMIT_MAX_BUCKETS);
    // The newcomer keeps its live budget (was not the one evicted).
    expect(checkRateLimit('newcomer', later + 1).retryAfterMs).toBeUndefined();
  });
});
