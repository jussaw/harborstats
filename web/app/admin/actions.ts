'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { verifyPassword, signSession, COOKIE_NAME } from '@/lib/admin-auth'

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  maxAge: 60 * 60 * 24 * 30,
  path: '/',
}

export async function loginAction(formData: FormData) {
  const password = (formData.get('password') as string) ?? ''
  const next = (formData.get('next') as string) ?? '/admin'
  const safeNext = next.startsWith('/') ? next : '/admin'

  if (!verifyPassword(password)) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(safeNext)}`)
  }

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
