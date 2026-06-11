'use client'

import { useEffect, useRef } from 'react'
import { loginAction } from '@/app/admin/actions'

interface Props {
  next: string
  hasError: boolean
}

export function LoginForm({ next, hasError }: Props) {
  const passwordInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    passwordInputRef.current?.focus()
  }, [])

  return (
    <form action={loginAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {hasError && (
        <p className="
          rounded-lg border border-red-500/50 bg-red-950/60 px-4 py-2.5 text-sm
          tracking-wide text-red-300
        ">
          Incorrect password. Try again.
        </p>
      )}

      <label className="flex flex-col gap-2" htmlFor="admin-password">
        <span className="text-xs font-medium tracking-wide text-(--cream)/70">
          Password
        </span>
        <input
          id="admin-password"
          ref={passwordInputRef}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="
            rounded-lg border border-(--border-gold) bg-(--navy-950)/60 px-4
            py-3 text-(--cream) transition-colors
            placeholder:text-(--cream)/30
            focus:border-(--gold) focus:ring-2 focus:ring-(--gold)/30
            focus:outline-none
          "
          placeholder="••••••••••••"
        />
      </label>

      <button
        type="submit"
        className="
          w-full rounded-lg border border-(--gold-600)
          bg-(image:--gradient-gold) px-6 py-3 text-sm font-semibold
          text-(--navy-900) shadow-[0_6px_16px_rgb(232_178_58/0.25)]
          transition-all
          hover:brightness-110
        "
      >
        Enter
      </button>
    </form>
  )
}
