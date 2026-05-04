import Link from 'next/link'
import { listAllGames } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import { ConfirmDeleteButton } from '@/app/admin/ConfirmDeleteButton'
import { NewGameButton } from '@/components/NewGameButton'
import { PageWidth } from '@/components/PageWidth'
import { FormattedDate } from '@/components/FormattedDate'
import { deleteGameAction } from './actions'

export const dynamic = 'force-dynamic'

export default async function AdminGamesPage() {
  const [games, players] = await Promise.all([listAllGames(), getPlayers()])

  return (
    <PageWidth width="5xl" className="px-6 py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-cinzel text-xl tracking-wide text-(--gold)">Games</h1>
            <p className="mt-0.5 text-xs text-(--cream)/50">{games.length} recorded</p>
          </div>
          <NewGameButton
            players={players}
            className="
              font-cinzel rounded-sm border border-(--gold) bg-(--gold) px-4
              py-2 text-xs font-semibold tracking-widest text-(--navy-900)
              uppercase transition-colors
              hover:bg-(--cream)
            "
          />
        </div>

        {games.length === 0 ? (
          <p className="py-16 text-center text-sm text-(--cream)/40">No games recorded yet.</p>
        ) : (
          <div
            className="overflow-hidden rounded-lg border"
            style={{ borderColor: 'color-mix(in srgb, var(--gold) 20%, transparent)' }}
          >
            {games.map((game, idx) => (
              <div
                key={game.id}
                className="flex items-center gap-4 px-5 py-4"
                style={{
                  borderBottom:
                    idx < games.length - 1
                      ? '1px solid color-mix(in srgb, var(--gold) 15%, transparent)'
                      : undefined,
                  background:
                    idx % 2 === 0
                      ? 'color-mix(in srgb, var(--navy-900) 90%, black)'
                      : 'transparent',
                }}
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
                      font-cinzel text-xs tracking-widest text-(--gold)/70
                      uppercase transition-colors
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
                      font-cinzel text-xs tracking-widest text-red-500/60
                      uppercase transition-colors
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
