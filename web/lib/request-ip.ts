/**
 * Resolves the originating client IP from request headers.
 *
 * Behind Cloudflare, `cf-connecting-ip` is the trustworthy source; the
 * `x-forwarded-for` / `x-real-ip` fallbacks are spoofable but kept for
 * non-Cloudflare/local environments. Returns the first `x-forwarded-for` hop
 * (the original client) when that header is used.
 */
export function getClientIp(headers: Headers): string | null {
  const cfConnectingIp = headers.get('cf-connecting-ip')
  if (cfConnectingIp) return cfConnectingIp.trim()

  const forwardedFor = headers.get('x-forwarded-for')
  if (forwardedFor) {
    const firstHop = forwardedFor.split(',')[0]?.trim()
    if (firstHop) return firstHop
  }

  const realIp = headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  return null
}
