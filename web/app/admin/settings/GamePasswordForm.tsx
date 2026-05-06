'use client'

import { useActionState } from 'react'
import { setNewGamePasswordAction } from './actions'
import type { SetPasswordState } from './actions'

interface Props {
  isSet: boolean
}

export function GamePasswordForm({ isSet }: Props) {
  const [state, action] = useActionState<SetPasswordState, FormData>(
    setNewGamePasswordAction,
    {},
  )

  return (
    <div
      className="rounded-lg border p-5"
      style={{
        borderColor: 'color-mix(in srgb, var(--gold) 20%, transparent)',
        background: 'color-mix(in srgb, var(--navy-900) 80%, black)',
      }}
    >
      <p
        className="
          font-cinzel mb-4 text-xs tracking-widest text-(--gold) uppercase
        "
      >
        Game creation password
      </p>
      <p className="mb-4 text-xs text-(--cream)/50">
        Status:{' '}
        <span className={isSet ? 'text-green-400' : 'text-amber-400'}>
          {isSet ? 'Set' : 'Not set'}
        </span>
      </p>

      {state.ok && (
        <p className="
          mb-4 rounded-sm border border-green-500/50 bg-green-950/60 px-4 py-2.5
          text-sm tracking-wide text-green-300
        ">
          Password updated successfully.
        </p>
      )}
      {state.error && (
        <p className="
          mb-4 rounded-sm border border-red-500/50 bg-red-950/60 px-4 py-2.5
          text-sm tracking-wide text-red-300
        ">
          {state.error}
        </p>
      )}

      <form action={action} className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label className="flex flex-col gap-1.5 text-xs text-(--cream)/50" htmlFor="new-game-password">
            <span>{isSet ? 'Change password' : 'Set password'}</span>
            <input
              id="new-game-password"
              name="new_game_password"
              type="password"
              autoComplete="new-password"
              minLength={4}
              required
              className="
                rounded-sm border border-(--gold)/40 bg-(--navy-900) px-3 py-2
                text-sm text-(--cream) transition-colors
                placeholder:text-(--cream)/30
                focus:border-(--gold) focus:outline-none
              "
              placeholder="New password"
            />
          </label>
        </div>
        <button
          type="submit"
          className="
            font-cinzel rounded-sm border border-(--gold) bg-(--gold) px-4 py-2
            text-xs font-semibold tracking-widest text-(--navy-900) uppercase
            transition-colors
            hover:bg-(--cream)
          "
        >
          Save
        </button>
      </form>
    </div>
  )
}
