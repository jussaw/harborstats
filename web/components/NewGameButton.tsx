'use client'

import { useRef, useState } from 'react'
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
  const [openKey, setOpenKey] = useState(0)
  const titleId = 'new-game-dialog-title'

  function openDialog() {
    setOpenKey((key) => key + 1)
    dialogRef.current?.showModal()
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
          <GameForm
            key={openKey}
            action={createGameAction}
            players={players}
            onSuccess={() => {
              closeDialog()
              router.refresh()
            }}
          />
        </div>
      </dialog>
    </>
  )
}
