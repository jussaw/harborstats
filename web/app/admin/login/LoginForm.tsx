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
          rounded-sm border border-red-500/50 bg-red-950/60 px-4 py-2.5 text-sm
          tracking-wide text-red-300
        ">
          Incorrect password. Try again.
        </p>
      )}

      <label className="flex flex-col gap-2" htmlFor="admin-password">
        <span className="
          font-cinzel text-xs tracking-widest text-(--gold) uppercase
        ">
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
            rounded-sm border border-(--gold)/50 bg-(--navy-900) px-4 py-3
            text-(--cream) transition-colors
            placeholder:text-(--cream)/30
            focus:border-(--gold) focus:outline-none
          "
          placeholder="••••••••••••"
        />
      </label>

      <button
        type="submit"
        className="
          font-cinzel w-full rounded-sm border border-(--gold) bg-(--gold) px-6
          py-3 font-semibold tracking-widest text-(--navy-900) uppercase
          transition-colors
          hover:bg-(--cream)
        "
      >
        Enter
      </button>
    </form>
  )
}
