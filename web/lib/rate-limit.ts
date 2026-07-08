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
// Hard ceiling on tracked keys. Sweeping only removes *expired* windows, so a
// burst of many unique keys inside a single window (reachable only if the
// client IP is spoofable) leaves nothing to sweep and the map would grow without
// bound. Past this size the soonest-to-expire windows are evicted instead —
// they were about to reset anyway, so eviction does the least harm.
export const RATE_LIMIT_MAX_BUCKETS = 10000
// When the ceiling is hit, evict in one batch down to this low-water mark so the
// (sorted) eviction runs about once per 10% of the ceiling rather than on every
// insert — amortized O(1) per insert under a flood.
const EVICT_LOW_WATER = Math.floor(RATE_LIMIT_MAX_BUCKETS * 0.9)

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

// Evicts the soonest-to-expire windows in one batch, down to EVICT_LOW_WATER, so
// the map stays under RATE_LIMIT_MAX_BUCKETS. Runs only after sweeping fails to
// make room, i.e. under a flood of live unique keys.
function evictToMakeRoom(): void {
  const evictCount = buckets.size - EVICT_LOW_WATER
  if (evictCount <= 0) return
  const byResetAsc = [...buckets.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt)
  for (let i = 0; i < evictCount; i += 1) {
    buckets.delete(byResetAsc[i][0])
  }
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
    // Enforce the hard ceiling only when adding a brand-new key; replacing an
    // existing (expired) key doesn't grow the map.
    if (!existing && buckets.size >= RATE_LIMIT_MAX_BUCKETS) {
      evictToMakeRoom()
    }
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

/** Test-only: current number of tracked keys, for asserting the memory ceiling. */
export function rateLimitBucketCount(): number {
  return buckets.size
}
