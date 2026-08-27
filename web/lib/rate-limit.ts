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
// IPs — either by rotating through an IPv6 prefix (every address in a /64 is a
// distinct key, no spoofing required) or by spoofing forwarding headers.
const SWEEP_THRESHOLD = 1000
// Hard ceiling on tracked keys. Sweeping only removes *expired* windows, so a
// burst of many unique keys inside a single window (reachable via IPv6 prefix
// rotation or forwarding-header spoofing) leaves nothing to sweep and the map
// would grow without bound. Past this size the least-exhausted windows — those
// with the most time left before they reset — are evicted instead; see
// evictToMakeRoom for why retaining the most-exhausted windows preserves the
// rate limit.
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

// Soonest `resetAt` across all tracked windows. Sweeping is pointless until this
// moment arrives (nothing is expired yet), so gating the O(n) sweep on it keeps a
// flood of same-timestamp keys from re-scanning the whole map on every insert.
let earliestResetAt = Infinity

function sweepExpired(now: number): void {
  let nextEarliest = Infinity
  buckets.forEach((state, key) => {
    if (now >= state.resetAt) {
      buckets.delete(key)
    } else if (state.resetAt < nextEarliest) {
      nextEarliest = state.resetAt
    }
  })
  earliestResetAt = nextEarliest
}

// Evicts the least-exhausted windows in one batch, down to EVICT_LOW_WATER, so
// the map stays under RATE_LIMIT_MAX_BUCKETS. Runs only after sweeping fails to
// make room, i.e. under a flood of live unique keys.
//
// `resetAt` is fixed when a window is created, so the *latest* resetAt marks the
// most recently created windows — the ones with the most time remaining and,
// under a flood, the fewest attempts recorded so far. Those are the least useful
// for rate limiting, so evicting them first does the least harm: it hands budget
// back only to keys that had barely spent any. Evicting the *soonest*-to-expire
// windows (the previous behaviour) would instead discard the oldest, most-
// exhausted buckets — exactly the ones actively blocking a brute-force attacker —
// refunding their attempt budget. So we sort by DESCENDING resetAt and drop from
// the top, retaining the most-exhausted (soonest-to-expire) keys.
function evictToMakeRoom(): void {
  const evictCount = buckets.size - EVICT_LOW_WATER
  if (evictCount <= 0) return
  const byResetDesc = [...buckets.entries()].sort((a, b) => b[1].resetAt - a[1].resetAt)
  for (let i = 0; i < evictCount; i += 1) {
    buckets.delete(byResetDesc[i][0])
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
 *
 * `key` is opaque here — callers build it (e.g. `admin-login:<ip>`). Callers that
 * key on a client IP must first pass the IP through `normalizeForRateLimit`
 * (`@/lib/request-ip`) so that an attacker rotating through an IPv6 /64 (2^64
 * addresses, no spoofing required) collapses to a single bucket instead of
 * getting a fresh budget per address. The limiter cannot aggregate here because
 * the key is already prefixed and opaque by the time it arrives.
 */
export function checkRateLimit(key: string, now: number = Date.now()): RateLimitResult {
  if (buckets.size >= SWEEP_THRESHOLD && now >= earliestResetAt) {
    sweepExpired(now)
  }

  const existing = buckets.get(key)

  if (!existing || now >= existing.resetAt) {
    // Enforce the hard ceiling only when adding a brand-new key; replacing an
    // existing (expired) key doesn't grow the map.
    if (!existing && buckets.size >= RATE_LIMIT_MAX_BUCKETS) {
      evictToMakeRoom()
    }
    const resetAt = now + WINDOW_MS
    buckets.set(key, { count: 1, resetAt })
    if (resetAt < earliestResetAt) {
      earliestResetAt = resetAt
    }
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
  earliestResetAt = Infinity
}

/** Test-only: current number of tracked keys, for asserting the memory ceiling. */
export function rateLimitBucketCount(): number {
  return buckets.size
}
