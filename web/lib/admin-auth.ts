export const COOKIE_NAME = 'hs_admin'
const THIRTY_DAYS_SECS = 60 * 60 * 24 * 30
const SESSION_SCOPE = 'admin'
const AUTH_REQUIRED_ERROR = 'Admin authentication required'

// Bumping ADMIN_SESSION_VERSION invalidates every existing admin session
// without rotating ADMIN_SESSION_SECRET — a redeploy-friendly "log everyone
// out" lever. Kept stateless (env-based) so verifySession stays edge-safe.
function getSessionVersion(): string {
  return process.env.ADMIN_SESSION_VERSION ?? '1'
}

async function importKey(secret: string, usage: KeyUsage): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    [usage],
  )
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await importKey(secret, 'sign')
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message))
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

function getSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) {
    throw new Error('ADMIN_SESSION_SECRET is required')
  }
  return secret
}

function hexToBytes(hex: string): ArrayBuffer {
  const bytes = new Uint8Array((hex.match(/.{2}/g) ?? []).map((b) => parseInt(b, 16)))
  return bytes.buffer
}

export async function signSession(): Promise<string> {
  const secret = getSessionSecret()
  const iat = Math.floor(Date.now() / 1000).toString()
  const payload = `${SESSION_SCOPE}:${getSessionVersion()}:${iat}`
  const sig = await hmacHex(secret, payload)
  return `${payload}.${sig}`
}

export async function verifySession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return false

  const dot = cookieValue.indexOf('.')
  if (dot === -1) return false

  const payload = cookieValue.slice(0, dot)
  const receivedSig = cookieValue.slice(dot + 1)
  const [scope, version, iat] = payload.split(':')

  if (scope !== SESSION_SCOPE || !iat) return false
  if (version !== getSessionVersion()) return false

  const issuedAt = parseInt(iat, 10)
  if (Number.isNaN(issuedAt)) return false
  if (Math.floor(Date.now() / 1000) - issuedAt > THIRTY_DAYS_SECS) return false

  const key = await importKey(secret, 'verify')
  return crypto.subtle.verify('HMAC', key, hexToBytes(receivedSig), new TextEncoder().encode(payload))
}

// Constant-time XOR-accumulate over two equal-length buffers. node:crypto's
// timingSafeEqual would be simpler but is not available in the Edge runtime
// this module is bundled into (via proxy.ts), so the compare is done by hand.
function timingSafeEqualBytes(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i += 1) {
    // eslint-disable-next-line no-bitwise -- bitwise ops are required for a constant-time compare
    diff |= a[i] ^ b[i]
  }
  return diff === 0
}

export async function verifyPassword(input: string): Promise<boolean> {
  const correct = process.env.ADMIN_PASSWORD ?? ''
  if (correct.length === 0) return false

  // SHA-256 both sides to fixed 32-byte digests before comparing: the compare
  // is constant-time and length-independent, so timing leaks neither the
  // password contents nor its length. Web Crypto keeps this edge-safe.
  const encoder = new TextEncoder()
  const [inputDigest, correctDigest] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(input)),
    crypto.subtle.digest('SHA-256', encoder.encode(correct)),
  ])

  return timingSafeEqualBytes(new Uint8Array(inputDigest), new Uint8Array(correctDigest))
}

export async function isAdminSession(): Promise<boolean> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return verifySession(cookieStore.get(COOKIE_NAME)?.value)
}

export async function requireAdminSession(): Promise<void> {
  if (!(await isAdminSession())) {
    throw new Error(AUTH_REQUIRED_ERROR)
  }
}
