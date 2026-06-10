'use server'

import { cookies, headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyPassword, signSession, COOKIE_NAME } from '@/lib/admin-auth'
import { checkRateLimit, clearRateLimit } from '@/lib/rate-limit'
import { getClientIp } from '@/lib/request-ip'

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 30,
  path: '/',
}

function sanitizeAdminNext(value: FormDataEntryValue | null): string {
  if (typeof value !== 'string') return '/admin'
  if (value === '/admin' || value.startsWith('/admin/')) return value
  return '/admin'
}

export async function loginAction(formData: FormData) {
  const password = (formData.get('password') as string) ?? ''
  const safeNext = sanitizeAdminNext(formData.get('next'))

  const hdrs = await headers()
  const rateKey = `admin-login:${getClientIp(hdrs) ?? 'unknown'}`
  if (!checkRateLimit(rateKey).allowed) {
    // Reuse the generic error so a throttled attacker learns nothing about
    // whether the submitted password was correct.
    redirect(`/admin/login?error=1&next=${encodeURIComponent(safeNext)}`)
  }

  if (!(await verifyPassword(password))) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(safeNext)}`)
  }

  // A successful login shouldn't count toward the failure budget, or a few
  // legitimate logins from one NAT would lock out the rest of the group.
  clearRateLimit(rateKey)

  const sessionValue = await signSession()
  const cookieStore = await cookies()
  cookieStore.set(COOKIE_NAME, sessionValue, SESSION_COOKIE_OPTIONS)
  redirect(safeNext)
}

export async function logoutAction() {
  const cookieStore = await cookies()
  cookieStore.delete(COOKIE_NAME)
  redirect('/admin/login')
}
