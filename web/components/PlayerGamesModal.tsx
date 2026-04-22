'use client'

import { useId, useRef } from 'react'
import { FormattedDate } from '@/components/FormattedDate'
import type { RecentGame } from '@/lib/games'
import type { Player } from '@/lib/players'

const cinzelStyle = {
  fontFamily: 'var(--font-cinzel), Georgia, serif',
}

interface Props {
  player: Player
  games: RecentGame[]
}

function sortPlayersByScore(game: RecentGame) {
  return [...game.players].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score
    }

    if (left.isWinner !== right.isWinner) {
      return Number(right.isWinner) - Number(left.isWinner)
    }

    return left.playerName.localeCompare(right.playerName)
  })
}

export function PlayerGamesModal({ player, games }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  function openDialog() {
    dialogRef.current?.showModal()
  }

  function closeDialog() {
    dialogRef.current?.close()
  }

  return (
    <>
      <button
        type="button"
        onClick={openDialog}
        style={cinzelStyle}
        className="
          inline-flex items-center justify-center rounded-md border
          border-(--gold)/20 bg-(--navy-800)/55 px-3 py-2 text-xs
          tracking-[0.2em] text-(--cream)/75 uppercase transition-colors
          hover:border-(--gold)/45 hover:text-(--gold)
        "
      >
        View Games ({games.length})
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
        <div
          className="
            relative z-10 flex w-[min(56rem,calc(100vw-2rem))] max-w-4xl
            flex-col rounded-2xl border border-(--gold)/30 bg-(--navy-900) p-5
            shadow-[0_24px_60px_rgba(0,0,0,0.4)]
            sm:p-6
          "
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2
                id={titleId}
                style={cinzelStyle}
                className="text-2xl tracking-wide text-(--gold)"
              >
                Games for {player.name}
              </h2>
              <p className="mt-1 text-sm text-(--cream)/55">{games.length} recorded</p>
            </div>
            <button
              type="button"
              onClick={closeDialog}
              className="
                text-xl leading-none text-(--cream)/60 transition-colors
                hover:text-(--cream)
              "
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="mt-6 max-h-[min(70vh,40rem)] overflow-y-auto pr-1">
            {games.length === 0 ? (
              <p className="py-8 text-center text-sm text-(--cream)/50">No games recorded yet.</p>
            ) : (
              <div className="space-y-4">
                {games.map((game) => (
                  <article
                    key={game.id}
                    className="
                      rounded-2xl border border-(--gold)/20 bg-(--navy-800)/40
                      p-4
                    "
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <FormattedDate
                        iso={game.playedAt.toISOString()}
                        className="text-xs text-(--cream)/55"
                      />
                      {game.notes ? (
                        <p
                          className="
                            max-w-xs text-right text-xs text-(--cream)/50 italic
                          "
                        >
                          {game.notes}
                        </p>
                      ) : null}
                    </div>

                    <ul className="space-y-1.5">
                      {sortPlayersByScore(game).map((gamePlayer) => {
                        const isSelectedPlayer = gamePlayer.playerName === player.name

                        return (
                          <li
                            key={gamePlayer.playerName}
                            data-selected-player={isSelectedPlayer ? 'true' : undefined}
                            className={`
                              flex items-center gap-2 rounded-lg px-2 py-1.5
                              text-sm
                              ${
                              isSelectedPlayer
                                ? 'bg-(--gold)/10 text-(--gold)'
                                : 'text-(--cream)'
                            }
                            `}
                          >
                            <span className="w-4 text-center">{gamePlayer.isWinner ? '⭐' : ''}</span>
                            <span className={isSelectedPlayer ? 'font-semibold' : undefined}>
                              {gamePlayer.playerName}
                            </span>
                            <span
                              className="ml-auto text-(--cream)/70 tabular-nums"
                            >
                              {gamePlayer.score}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </dialog>
    </>
  )
}
