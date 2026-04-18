'use client'

import { loginAction } from '@/app/admin/actions'

interface Props {
  next: string
  hasError: boolean
}

export function LoginForm({ next, hasError }: Props) {
  return (
    <form action={loginAction} className="space-y-5">
      <input type="hidden" name="next" value={next} />

      {hasError && (
        <p className="rounded border border-red-500/50 bg-red-950/60 px-4 py-2.5 text-sm text-red-300 tracking-wide">
          Incorrect password. Try again.
        </p>
      )}

      {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
      <label className="flex flex-col gap-2">
        <span className="font-cinzel text-xs tracking-widest text-[var(--gold)] uppercase">
          Password
        </span>
        <input
          name="password"
          type="password"
          /* eslint-disable-next-line jsx-a11y/no-autofocus */
          autoFocus
          autoComplete="current-password"
          required
          className="rounded border border-[var(--gold)]/50 bg-[var(--navy-900)] px-4 py-3 text-[var(--cream)] placeholder:text-[var(--cream)]/30 focus:border-[var(--gold)] focus:outline-none transition-colors"
          placeholder="••••••••••••"
        />
      </label>

      <button
        type="submit"
        className="font-cinzel w-full rounded border border-[var(--gold)] bg-[var(--gold)] px-6 py-3 text-[var(--navy-900)] font-semibold tracking-widest uppercase hover:bg-[var(--cream)] transition-colors"
      >
        Enter
      </button>
    </form>
  )
}
