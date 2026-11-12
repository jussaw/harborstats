import { isIP } from 'node:net'

/**
 * Expands an IPv6 address to its eight hextets, resolving the single optional
 * `::` run to the zero groups it stands for. Returns `null` for a malformed
 * address.
 */
function expandIpv6Hextets(address: string): string[] | null {
  const sides = address.split('::')
  if (sides.length > 2) return null

  const head = sides[0] ? sides[0].split(':') : []
  const tail = sides.length === 2 && sides[1] ? sides[1].split(':') : []

  if (sides.length === 2) {
    const missing = 8 - head.length - tail.length
    if (missing < 1) return null
    return [...head, ...new Array(missing).fill('0'), ...tail]
  }

  return head.length === 8 ? head : null
}

/**
 * Formats a valid IPv6 address the way PostgreSQL's `inet` printed it
 * (`inet_net_ntop_ipv6`): lowercase hex without leading zeros, the first longest
 * run of two or more zero groups shortened to `::`, and a dotted IPv4 tail for
 * IPv4-mapped (`::ffff:a.b.c.d`) and IPv4-compatible (`::a.b.c.d`) addresses.
 * IPs are stored as text, so new rows must match the rows carried over from
 * Postgres. Returns `null` for a zone id (`fe80::1%eth0`), which `inet` rejected.
 */
function canonicalIpv6(address: string): string | null {
  if (address.includes('%')) return null

  // Rewrite a dotted IPv4 tail as the two hex groups it stands for.
  const lastColon = address.lastIndexOf(':')
  const tail = address.slice(lastColon + 1)
  let hexOnly = address
  if (tail.includes('.')) {
    const [a, b, c, d] = tail.split('.').map(Number)
    hexOnly = `${address.slice(0, lastColon + 1)}${(a * 256 + b).toString(16)}:${(c * 256 + d).toString(16)}`
  }

  const hextets = expandIpv6Hextets(hexOnly)
  if (!hextets) return null
  const words = hextets.map((hextet) => parseInt(hextet, 16))

  let bestBase = -1
  let bestLen = 0
  let curBase = -1
  let curLen = 0
  words.forEach((word, i) => {
    if (word !== 0) {
      curBase = -1
      return
    }
    if (curBase === -1) {
      curBase = i
      curLen = 0
    }
    curLen += 1
    if (curLen > bestLen) {
      bestBase = curBase
      bestLen = curLen
    }
  })
  if (bestLen < 2) bestBase = -1

  let out = ''
  for (let i = 0; i < 8; i += 1) {
    if (bestBase !== -1 && i >= bestBase && i < bestBase + bestLen) {
      if (i === bestBase) out += ':'
    } else {
      if (i !== 0) out += ':'
      const embedsIpv4 =
        i === 6 && bestBase === 0 && (bestLen === 6 || (bestLen === 5 && words[5] === 0xffff))
      if (embedsIpv4) {
        const octets = [words[6], words[7]].flatMap((word) => [Math.floor(word / 256), word % 256])
        out += octets.join('.')
        break
      }
      out += words[i].toString(16)
    }
  }
  if (bestBase !== -1 && bestBase + bestLen === 8) out += ':'
  return out
}

/**
 * Returns `value` when it is a literal IPv4 address, its canonical form when it
 * is a literal IPv6 address, otherwise `null`. `node:net`'s `isIP` rejects
 * hostnames, `unknown`, and address-with-port forms.
 */
function normalizeIp(value: string): string | null {
  const family = isIP(value)
  if (family === 0) return null
  if (family === 6) return canonicalIpv6(value)
  return value
}

/**
 * Resolves the originating client IP from request headers.
 *
 * Behind Cloudflare, `cf-connecting-ip` is the trustworthy source; the
 * `x-forwarded-for` / `x-real-ip` fallbacks are spoofable but kept for
 * non-Cloudflare/local environments. Returns the first `x-forwarded-for` hop
 * (the original client) when that header is used.
 *
 * The selected value is validated as a literal IPv4/IPv6 address before being
 * returned, and IPv6 is returned in canonical form. A malformed value
 * (hostname, `unknown`, `ip:port`, zone id, etc.) yields `null` rather than
 * being stored as the actor/submitter IP. Validation does not fall through to
 * lower-precedence headers: once a source is selected, an invalid value there
 * returns `null`.
 */
export function getClientIp(headers: Headers): string | null {
  const cfConnectingIp = headers.get('cf-connecting-ip')?.trim()
  if (cfConnectingIp) return normalizeIp(cfConnectingIp)

  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstHop = forwardedFor.split(',')[0]?.trim()
    if (firstHop) return normalizeIp(firstHop)
  }

  const realIp = headers.get('x-real-ip')?.trim()
  if (realIp) return normalizeIp(realIp)

  return null
}

// An IPv6 /64 spans the first four hextets. ISPs hand out a /64 (or larger) to a
// single customer, so it is the smallest block that reliably maps to one client.
const IPV6_PREFIX_HEXTETS = 4

// IPv4-mapped IPv6 addresses (::ffff:a.b.c.d) carry the v4 address in the last
// 32 bits. Collapsing them to a /64 would fold every mapped v4 client into one
// shared bucket, so they must be extracted and treated as plain IPv4 instead.
const IPV4_MAPPED_PREFIX = '::ffff:'

/**
 * Derives a rate-limit key from a client IP so that related addresses share a
 * single bucket.
 *
 * IPv4 addresses are returned unchanged. IPv4-mapped IPv6 addresses
 * (`::ffff:a.b.c.d`) are unwrapped to the embedded IPv4 so each maps to its own
 * bucket — a /64 grouping is meaningless for them. Native IPv6 addresses are
 * collapsed to their /64 prefix (the first four hextets, each stripped of
 * leading zeros) — the standard per-customer allocation — so an attacker who
 * controls a /64 cannot mint 2^64 independent rate-limit budgets by rotating
 * the host portion of the address. Inputs that are not literal IP addresses are
 * returned unchanged.
 */
export function normalizeForRateLimit(ip: string): string {
  if (isIP(ip) !== 6) return ip

  // Unwrap IPv4-mapped addresses before /64 collapsing.
  if (ip.startsWith(IPV4_MAPPED_PREFIX)) {
    const v4 = ip.slice(IPV4_MAPPED_PREFIX.length)
    if (isIP(v4) === 4) return v4
  }

  const hextets = expandIpv6Hextets(ip)
  if (!hextets) return ip

  const prefix = hextets
    .slice(0, IPV6_PREFIX_HEXTETS)
    .map((hextet) => parseInt(hextet, 16).toString(16))
    .join(':')
  return `${prefix}::/64`
}
