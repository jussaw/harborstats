'use server'

import { cookies, headers } from 'next/headers'
import { signGameSession, COOKIE_NAME } from '@/lib/game-auth'
import { getNewGamePasswordHash } from '@/lib/settings'
import { verifyPasswordHash } from '@/lib/password-hash'
import { checkRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'

export interface UnlockState {
  ok: boolean
  error?: 'incorrect' | 'not-configured'
}

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 30,
  path: '/',
}

export async function unlockGameCreationAction(
  _prev: UnlockState,
  formData: FormData,
): Promise<UnlockState> {
  const password = (formData.get('password') as string) ?? ''

  const hdrs = await headers()
  const rateKey = `game-unlock:${getClientIp(hdrs) ?? 'unknown'}`
  if (!checkRateLimit(rateKey).allowed) {
    // Reuse the generic 'incorrect' shape so a throttled client learns nothing
    // about whether the submitted password was correct.
    return { ok: false, error: 'incorrect' }
  }

  const hash = await getNewGamePasswordHash()
  if (hash === null) {
    return { ok: false, error: 'not-configured' }
  }

  const valid = await verifyPasswordHash(password.trim(), hash)
  if (!valid) {
    return { ok: false, error: 'incorrect' }
  }

  const sessionValue = await signGameSession()
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, sessionValue, SESSION_COOKIE_OPTIONS)

  return { ok: true }
}
