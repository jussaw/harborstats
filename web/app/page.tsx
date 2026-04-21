import { listRecentGames } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import { getRecentActivitySummary } from '@/lib/stats'
import { NewGameButton } from '@/components/NewGameButton'
import { FormattedDate } from '@/components/FormattedDate'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [games, players, activitySummary] = await Promise.all([
    listRecentGames(),
    getPlayers(),
    getRecentActivitySummary(),
  ])

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-cinzel text-xl tracking-wide text-(--gold)">Recent Games</h1>
        <NewGameButton
          players={players}
          className="
            font-cinzel rounded-sm border border-(--gold) bg-(--gold) px-4 py-2
            text-sm font-semibold text-(--navy-900) transition-colors
            hover:bg-(--cream)
          "
        />
      </div>

      <section className="
        mb-6 rounded-2xl border border-(--gold)/20 bg-(--navy-900)/40 p-5
        shadow-[0_18px_40px_rgba(0,0,0,0.18)]
      ">
        <div className="border-b border-(--gold)/10 pb-4">
          <h2 className="font-cinzel text-xl tracking-wide text-(--cream)">Days Since Last Game</h2>
          <p className="mt-1 text-sm text-(--cream)/55">
            How long it has been since the latest recorded session.
          </p>
        </div>

        <div className="mt-4">
          {activitySummary.latestPlayedAt && activitySummary.daysSinceLastGame !== null ? (
            <div className="space-y-2">
              <p className="
                font-cinzel text-5xl leading-none font-semibold tracking-wide
                text-(--gold)
              ">
                {activitySummary.daysSinceLastGame}
              </p>
              <div className="text-sm text-(--cream)/55">
                <p>Latest recorded game</p>
                <FormattedDate
                  iso={activitySummary.latestPlayedAt.toISOString()}
                  className="mt-1 block text-(--cream)/70"
                />
              </div>
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-(--cream)/50">No games recorded yet.</p>
          )}
        </div>
      </section>

      {games.length === 0 ? (
        <p className="py-16 text-center text-(--cream) opacity-60">
          No games yet — record your first one!
        </p>
      ) : (
        <div className="space-y-4">
          {games.map((game) => (
            <article
              key={game.id}
              className="
                rounded-lg border border-(--gold)/30 bg-(--navy-900)/60 p-4
              "
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <FormattedDate iso={game.playedAt.toISOString()} className="
                  text-xs text-(--cream) opacity-60
                " />
                {game.notes && (
                  <p className="
                    max-w-xs text-right text-xs text-(--cream) italic opacity-50
                  ">
                    {game.notes}
                  </p>
                )}
              </div>

              <ul className="space-y-1">
                {[...game.players].sort((a, b) => b.score - a.score).map((p) => (
                  <li key={p.playerName} className="
                    flex items-center gap-2 text-sm
                  ">
                    <span className="w-4 text-center">
                      {p.isWinner ? '⭐' : ''}
                    </span>
                    <span className={p.isWinner ? `
                      font-cinzel font-semibold text-(--gold)
                    ` : `text-(--cream)`}>
                      {p.playerName}
                    </span>
                    <span className="
                      ml-auto text-(--cream) tabular-nums opacity-70
                    ">
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
