/**
 * Per-key fixed-window rate limiter.
 *
 * Backed by an in-memory `Map`, which is adequate for the current
 * single-container compose deployment — counters reset on process restart. A
 * multi-instance deployment would need a shared store (DB/Redis) so limits hold
 * across instances.
 */

const WINDOW_MS = 15 * 60 * 1000
const MAX_ATTEMPTS = 5

interface WindowState {
  count: number
  resetAt: number
}

const buckets = new Map<string, WindowState>()

export interface RateLimitResult {
  allowed: boolean
  retryAfterMs?: number
}

/**
 * Records an attempt for `key` and reports whether it is allowed. Each call
 * consumes one attempt; once `MAX_ATTEMPTS` are used within the window further
 * attempts are blocked until the window resets. `now` is injectable for tests.
 */
export function checkRateLimit(key: string, now: number = Date.now()): RateLimitResult {
  const existing = buckets.get(key)

  if (!existing || now >= existing.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true }
  }

  if (existing.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterMs: existing.resetAt - now }
  }

  existing.count += 1
  return { allowed: true }
}

/** Test-only: clears all rate-limit state. */
export function resetRateLimit(): void {
  buckets.clear()
}
