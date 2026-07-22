import { isIP } from 'node:net'

/**
 * Returns `value` when it is a literal IPv4 or IPv6 address, otherwise `null`.
 * `node:net`'s `isIP` rejects hostnames, `unknown`, and address-with-port forms.
 */
function normalizeIp(value: string): string | null {
  return isIP(value) === 0 ? null : value
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
 * returned. A malformed value (hostname, `unknown`, `ip:port`, etc.) yields
 * `null` rather than propagating to PostgreSQL's `inet` column and aborting the
 * request. Validation does not fall through to lower-precedence headers: once a
 * source is selected, an invalid value there returns `null`.
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
