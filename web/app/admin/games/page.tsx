import Link from 'next/link'
import { listAllGames } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import { ConfirmDeleteButton } from '@/app/admin/ConfirmDeleteButton'
import { NewGameButton } from '@/components/NewGameButton'
import { PageWidth } from '@/components/PageWidth'
import { FormattedDate } from '@/components/FormattedDate'
import { buttonClasses } from '@/components/ui/Button'
import { isGameSession } from '@/lib/game-auth'
import { deleteGameAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminGamesPage() {
  const [games, players, isUnlocked] = await Promise.all([
    listAllGames(),
    getPlayers(),
    isGameSession(),
  ])

  return (
    <PageWidth width="5xl" className="px-6 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-cinzel text-xl tracking-wide text-(--cream)">Games</h1>
            <p className="mt-0.5 text-xs text-(--cream)/50">{games.length} recorded</p>
          </div>
          <NewGameButton
            players={players}
            isUnlocked={isUnlocked}
            className={buttonClasses('primary', 'sm')}
          />
        </div>

        {games.length === 0 ? (
          <p className="py-16 text-center text-sm text-(--cream)/40">No games recorded yet.</p>
        ) : (
          <div
            className="
              overflow-hidden rounded-xl border border-(--border-gold-subtle)
            "
          >
            {games.map((game) => (
              <div
                key={game.id}
                className="
                  flex items-center gap-4 border-b border-(--border-gold-subtle)
                  bg-(--surface-subtle) px-5 py-4 transition-colors
                  last:border-b-0
                  hover:bg-(--gold)/5
                "
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <FormattedDate iso={game.playedAt.toISOString()} className="
                      text-xs text-(--cream)/60
                    " />
                    {game.notes && (
                      <span className="
                        truncate text-xs text-(--cream)/40 italic
                      ">
                        {game.notes}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                    {game.players.map((p) => (
                      <span key={p.playerName} className="text-xs">
                        {p.isWinner && <span className="mr-1">⭐</span>}
                        <span
                          className={
                            p.isWinner ? 'text-(--gold)' : `text-(--cream)/70`
                          }
                        >
                          {p.playerName}
                        </span>
                        <span className="ml-1 text-(--cream)/40 tabular-nums">
                          {p.score}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    href={`/admin/games/${game.id}/edit`}
                    className="
                      text-xs font-medium text-(--gold)/70 transition-colors
                      hover:text-(--gold)
                    "
                  >
                    Edit
                  </Link>
                  <ConfirmDeleteButton
                    formAction={deleteGameAction}
                    hiddenFields={{ game_id: String(game.id) }}
                    confirmMessage={`Delete game #${game.id}? This cannot be undone.`}
                    label="Delete"
                    className="
                      text-xs font-medium text-red-500/60 transition-colors
                      hover:text-red-400
                    "
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageWidth>
  )
}
