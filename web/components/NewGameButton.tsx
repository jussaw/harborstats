'use client'

import { useRef } from 'react'
import { useRouter } from 'next/navigation'
import { GameForm } from '@/components/GameForm'
import { createGameAction } from '@/app/actions'
import type { Player } from '@/lib/players'

interface Props {
  players: Player[]
  className: string
}

export function NewGameButton({ players, className }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const router = useRouter()

  return (
    <>
      <button type="button" className={className} onClick={() => dialogRef.current?.showModal()}>
        + New Game
      </button>
      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close()
        }}
        className="fixed inset-0 m-auto rounded-lg border border-[var(--gold)] bg-[var(--navy-900)] p-6 w-full max-w-2xl open:flex open:flex-col [&::backdrop]:bg-black/70"
      >
        <div className="mb-6 flex items-center justify-between">
          <h2 className="font-cinzel text-2xl text-[var(--gold)] tracking-wide">New Game</h2>
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="text-[var(--cream)]/60 hover:text-[var(--cream)] text-xl leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <GameForm
          action={createGameAction}
          players={players}
          onSuccess={() => {
            dialogRef.current?.close()
            router.refresh()
          }}
        />
      </dialog>
    </>
  )
}
