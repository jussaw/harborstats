'use client'

import { useRef, useState, useEffect, useActionState } from 'react'
import { useRouter } from 'next/navigation'
import { GameForm } from '@/components/GameForm'
import { createGameAction } from '@/app/actions'
import { unlockGameCreationAction } from '@/app/actions/game-unlock'
import type { UnlockState } from '@/app/actions/game-unlock'
import type { Player } from '@/lib/players'

interface Props {
  players: Player[]
  className: string
  isUnlocked: boolean
}

export function NewGameButton({ players, className, isUnlocked }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const passwordRef = useRef<HTMLInputElement>(null)
  const router = useRouter()
  const [openKey, setOpenKey] = useState(0)
  const [unlockState, unlockAction] = useActionState<UnlockState, FormData>(
    unlockGameCreationAction,
    { ok: false },
  )
  const titleId = 'new-game-dialog-title'

  const unlocked = isUnlocked || unlockState.ok

  useEffect(() => {
    if (unlockState.ok) {
      router.refresh()
    }
  }, [unlockState.ok, router])

  useEffect(() => {
    if (!unlocked && dialogRef.current?.open) {
      passwordRef.current?.focus()
    }
  }, [unlocked])

  function openDialog() {
    setOpenKey((key) => key + 1)
    dialogRef.current?.showModal()
    if (!unlocked) {
      setTimeout(() => passwordRef.current?.focus(), 0)
    }
  }

  function closeDialog() {
    dialogRef.current?.close()
  }

  return (
    <>
      <button type="button" className={className} onClick={openDialog}>
        + New Game
      </button>
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onCancel={closeDialog}
        className="
          fixed inset-0 m-auto max-w-none border-none bg-transparent p-0
          open:grid open:place-items-center
        "
      >
        <button
          type="button"
          className="fixed inset-0 bg-black/70"
          onClick={closeDialog}
          aria-label="Dismiss dialog"
        />
        <div className="
          relative z-10 flex w-full max-w-2xl flex-col rounded-lg border
          border-(--gold) bg-(--navy-900) p-6
        ">
          <div className="mb-6 flex items-center justify-between">
            <h2 id={titleId} className="
              font-cinzel text-2xl tracking-wide text-(--gold)
            ">
              New Game
            </h2>
            <button
              type="button"
              onClick={closeDialog}
              className="
                text-xl leading-none text-(--cream)/60
                hover:text-(--cream)
              "
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {unlocked ? (
            <GameForm
              key={openKey}
              action={createGameAction}
              players={players}
              onSuccess={() => {
                closeDialog()
                router.refresh()
              }}
            />
          ) : (
            <form action={unlockAction} className="space-y-5">
              {unlockState.error === 'not-configured' && (
                <p className="
                  rounded-sm border border-amber-500/50 bg-amber-950/60 px-4
                  py-2.5 text-sm tracking-wide text-amber-300
                ">
                  No game password has been set yet. Ask an admin to configure one.
                </p>
              )}
              {unlockState.error === 'incorrect' && (
                <p className="
                  rounded-sm border border-red-500/50 bg-red-950/60 px-4 py-2.5
                  text-sm tracking-wide text-red-300
                ">
                  Incorrect password. Try again.
                </p>
              )}
              <label className="flex flex-col gap-2" htmlFor="game-password">
                <span className="
                  font-cinzel text-xs tracking-widest text-(--gold) uppercase
                ">
                  Password
                </span>
                <input
                  id="game-password"
                  ref={passwordRef}
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  className="
                    rounded-sm border border-(--gold)/50 bg-(--navy-900) px-4
                    py-3 text-(--cream) transition-colors
                    placeholder:text-(--cream)/30
                    focus:border-(--gold) focus:outline-none
                  "
                  placeholder="••••••••••••"
                />
              </label>
              <button
                type="submit"
                className="
                  font-cinzel w-full rounded-sm border border-(--gold)
                  bg-(--gold) px-6 py-3 font-semibold tracking-widest
                  text-(--navy-900) uppercase transition-colors
                  hover:bg-(--cream)
                "
              >
                Unlock
              </button>
            </form>
          )}
        </div>
      </dialog>
    </>
  )
}
