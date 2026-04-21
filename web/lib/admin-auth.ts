export const COOKIE_NAME = 'hs_admin'
const THIRTY_DAYS_SECS = 60 * 60 * 24 * 30

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
  const sig = await hmacHex(secret, iat)
  return `${iat}.${sig}`
}

export async function verifySession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return false

  const dot = cookieValue.indexOf('.')
  if (dot === -1) return false

  const iat = cookieValue.slice(0, dot)
  const receivedSig = cookieValue.slice(dot + 1)

  const issuedAt = parseInt(iat, 10)
  if (Number.isNaN(issuedAt)) return false
  if (Math.floor(Date.now() / 1000) - issuedAt > THIRTY_DAYS_SECS) return false

  const key = await importKey(secret, 'verify')
  return crypto.subtle.verify('HMAC', key, hexToBytes(receivedSig), new TextEncoder().encode(iat))
}

export function verifyPassword(input: string): boolean {
  const correct = process.env.ADMIN_PASSWORD ?? ''
  return correct.length > 0 && input === correct
}

export async function isAdminSession(): Promise<boolean> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return verifySession(cookieStore.get(COOKIE_NAME)?.value)
}
