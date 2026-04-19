import { listRecentGames } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import { NewGameButton } from '@/components/NewGameButton'
import { FormattedDate } from '@/components/FormattedDate'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [games, players] = await Promise.all([listRecentGames(20), getPlayers()])

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-cinzel text-3xl text-[var(--gold)] tracking-wide">HarborStats</h1>
        <NewGameButton
          players={players}
          className="font-cinzel rounded border border-[var(--gold)] bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[var(--navy-900)] hover:bg-[var(--cream)] transition-colors"
        />
      </div>

      {games.length === 0 ? (
        <p className="text-[var(--cream)] opacity-60 text-center py-16">
          No games yet — record your first one!
        </p>
      ) : (
        <div className="space-y-4">
          {games.map((game) => (
            <article
              key={game.id}
              className="rounded-lg border border-[var(--gold)]/30 bg-[var(--navy-900)]/60 p-4"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <FormattedDate iso={game.played_at.toISOString()} className="text-xs text-[var(--cream)] opacity-60" />
                {game.notes && (
                  <p className="text-xs text-[var(--cream)] opacity-50 italic max-w-xs text-right">
                    {game.notes}
                  </p>
                )}
              </div>

              <ul className="space-y-1">
                {[...game.players].sort((a, b) => b.score - a.score).map((p) => (
                  <li key={p.playerName} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-center">
                      {p.isWinner ? '⭐' : ''}
                    </span>
                    <span className={p.isWinner ? 'text-[var(--gold)] font-semibold font-cinzel' : 'text-[var(--cream)]'}>
                      {p.playerName}
                    </span>
                    <span className="ml-auto text-[var(--cream)] opacity-70 tabular-nums">
                      {p.score}
                    </span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
