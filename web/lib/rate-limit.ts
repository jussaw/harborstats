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
// Once the map grows past this many keys, expired windows are swept on the
// next attempt. Bounds memory growth when an attacker fabricates many client
// IPs via spoofed forwarding headers.
const SWEEP_THRESHOLD = 1000

interface WindowState {
  count: number
  resetAt: number
}

const buckets = new Map<string, WindowState>()

function sweepExpired(now: number): void {
  buckets.forEach((state, key) => {
    if (now >= state.resetAt) {
      buckets.delete(key)
    }
  })
}

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
  if (buckets.size >= SWEEP_THRESHOLD) {
    sweepExpired(now)
  }

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

/**
 * Forgets all attempts for `key`. Call after a successful authentication so
 * legitimate logins don't count toward the failure budget — otherwise a few
 * people unlocking from the same NAT (one game-night Wi-Fi) would lock out the
 * rest of the group.
 */
export function clearRateLimit(key: string): void {
  buckets.delete(key)
}

/** Test-only: clears all rate-limit state. */
export function resetRateLimit(): void {
  buckets.clear()
}
