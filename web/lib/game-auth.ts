import { getNewGamePasswordHash } from '@/lib/settings'
import { verifyPasswordHash } from '@/lib/password-hash'

export const COOKIE_NAME = 'hs_game'
const THIRTY_DAYS_SECS = 60 * 60 * 24 * 30
const SESSION_SCOPE = 'game'

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

export async function signGameSession(): Promise<string> {
  const secret = getSessionSecret()
  const iat = Math.floor(Date.now() / 1000).toString()
  const payload = `${SESSION_SCOPE}:${iat}`
  const sig = await hmacHex(secret, payload)
  return `${payload}.${sig}`
}

export async function verifyGameSession(cookieValue: string | undefined): Promise<boolean> {
  if (!cookieValue) return false
  const secret = process.env.ADMIN_SESSION_SECRET
  if (!secret) return false

  const dot = cookieValue.indexOf('.')
  if (dot === -1) return false

  const payload = cookieValue.slice(0, dot)
  const receivedSig = cookieValue.slice(dot + 1)
  const [scope, iat] = payload.split(':')

  if (scope !== SESSION_SCOPE || !iat) return false

  const issuedAt = parseInt(iat, 10)
  if (Number.isNaN(issuedAt)) return false
  if (Math.floor(Date.now() / 1000) - issuedAt > THIRTY_DAYS_SECS) return false

  const key = await importKey(secret, 'verify')
  return crypto.subtle.verify('HMAC', key, hexToBytes(receivedSig), new TextEncoder().encode(payload))
}

export async function isGameSession(): Promise<boolean> {
  const { cookies } = await import('next/headers')
  const cookieStore = await cookies()
  return verifyGameSession(cookieStore.get(COOKIE_NAME)?.value)
}

export async function verifyGamePassword(input: string): Promise<boolean> {
  const hash = await getNewGamePasswordHash()
  return verifyPasswordHash(input.trim(), hash)
}
