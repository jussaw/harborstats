import Link from 'next/link'
import { listAllGames } from '@/lib/games'
import { deleteGameAction } from './actions'
import { AdminShell } from '@/app/admin/AdminShell'
import { ConfirmDeleteButton } from '@/app/admin/ConfirmDeleteButton'

export const dynamic = 'force-dynamic'

function formatDate(d: Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(d))
}

export default async function AdminGamesPage() {
  const games = await listAllGames()

  return (
    <AdminShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-cinzel text-xl tracking-wide text-[var(--gold)]">Games</h1>
            <p className="mt-0.5 text-xs text-[var(--cream)]/50">{games.length} recorded</p>
          </div>
          <Link
            href="/new"
            className="font-cinzel rounded border border-[var(--gold)] bg-[var(--gold)] px-4 py-2 text-xs font-semibold tracking-widest text-[var(--navy-900)] uppercase hover:bg-[var(--cream)] transition-colors"
          >
            + New Game
          </Link>
        </div>

        {games.length === 0 ? (
          <p className="py-16 text-center text-sm text-[var(--cream)]/40">No games recorded yet.</p>
        ) : (
          <div
            className="rounded-lg border overflow-hidden"
            style={{ borderColor: 'color-mix(in srgb, var(--gold) 20%, transparent)' }}
          >
            {games.map((game, idx) => (
              <div
                key={game.id}
                className="flex items-start gap-4 px-5 py-4"
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <span className="font-cinzel text-xs text-[var(--gold)]/60">#{game.id}</span>
                    <time className="text-xs text-[var(--cream)]/60">{formatDate(game.played_at)}</time>
                    {game.notes && (
                      <span className="text-xs text-[var(--cream)]/40 italic truncate">
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
                            p.isWinner ? 'text-[var(--gold)]' : 'text-[var(--cream)]/70'
                          }
                        >
                          {p.playerName}
                        </span>
                        <span className="ml-1 text-[var(--cream)]/40 tabular-nums">
                          {p.score}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <Link
                    href={`/admin/games/${game.id}/edit`}
                    className="font-cinzel text-xs tracking-widest text-[var(--gold)]/70 uppercase hover:text-[var(--gold)] transition-colors"
                  >
                    Edit
                  </Link>
                  <ConfirmDeleteButton
                    formAction={deleteGameAction}
                    hiddenFields={{ game_id: String(game.id) }}
                    confirmMessage={`Delete game #${game.id}? This cannot be undone.`}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AdminShell>
  )
}
