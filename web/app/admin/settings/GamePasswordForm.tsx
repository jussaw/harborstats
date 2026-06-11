'use client'

import { useActionState } from 'react'
import { buttonClasses } from '@/components/ui/Button'
import { cardSurfaceClasses } from '@/components/ui/Card'
import { fieldClasses } from '@/components/ui/Field'
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
      className={`
        p-5
        ${cardSurfaceClasses}
      `}
    >
      <p
        className="
          mb-4 text-[10px] font-medium tracking-[0.2em] text-(--gold) uppercase
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
          mb-4 rounded-lg border border-green-500/50 bg-green-950/60 px-4 py-2.5
          text-sm tracking-wide text-green-300
        ">
          Password updated successfully.
        </p>
      )}
      {state.error && (
        <p className="
          mb-4 rounded-lg border border-red-500/50 bg-red-950/60 px-4 py-2.5
          text-sm tracking-wide text-red-300
        ">
          {state.error}
        </p>
      )}

      <form action={action} className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-48 flex-1 flex-col gap-1.5">
          <label className="
            flex flex-col gap-1.5 text-xs font-medium text-(--cream)/60
          " htmlFor="new-game-password">
            <span>{isSet ? 'Change password' : 'Set password'}</span>
            <input
              id="new-game-password"
              name="new_game_password"
              type="password"
              autoComplete="new-password"
              minLength={4}
              required
              className={fieldClasses}
              placeholder="New password"
            />
          </label>
        </div>
        <button type="submit" className={buttonClasses('primary', 'sm')}>
          Save
        </button>
      </form>
    </div>
  )
}
