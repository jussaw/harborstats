import { beforeEach, describe, expect, it } from 'vitest';
import { checkRateLimit, resetRateLimit } from '@/lib/rate-limit';

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
});
