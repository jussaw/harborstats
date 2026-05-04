import type { ReactNode } from 'react'
import { listRecentGames } from '@/lib/games'
import { getPlayers } from '@/lib/players'
import {
  getPlayerCurrentWinStreaks,
  getPlayerHotHandIndicators,
  getPlayerWinEvents,
  getRecentActivitySummary,
  getReigningChampionSummary,
} from '@/lib/stats'
import { CurrentWinStreakLeaderCard } from '@/components/CurrentWinStreakLeaderCard'
import { HotHandIndicatorCard } from '@/components/HotHandIndicatorCard'
import { NewGameButton } from '@/components/NewGameButton'
import { PageWidth } from '@/components/PageWidth'
import { PlayerOfMonthCard } from '@/components/PlayerOfMonthCard'
import { FormattedDate } from '@/components/FormattedDate'
import { RecentActivityCard } from '@/components/RecentActivityCard'

export const dynamic = 'force-dynamic'

function SummaryTile({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="
      rounded-2xl border border-(--gold)/20 bg-(--navy-900)/40 p-5
      shadow-[0_18px_40px_rgba(0,0,0,0.18)]
    ">
      <div className="border-b border-(--gold)/10 pb-4">
        <h2 className="font-cinzel text-xl tracking-wide text-(--cream)">{title}</h2>
        <p className="mt-1 text-sm text-(--cream)/55">{description}</p>
      </div>

      <div className="mt-4">{children}</div>
    </section>
  )
}

function formatNameList(names: string[]) {
  return names.join(', ')
}

export default async function HomePage() {
  const [
    games,
    players,
    activitySummary,
    reigningChampion,
    currentWinStreaks,
    playerWinEvents,
    hotHandIndicators,
  ] = await Promise.all([
    listRecentGames(),
    getPlayers(),
    getRecentActivitySummary(),
    getReigningChampionSummary(),
    getPlayerCurrentWinStreaks(),
    getPlayerWinEvents(),
    getPlayerHotHandIndicators(),
  ])

  return (
    <PageWidth width="5xl" className="px-4 py-12">
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

      <div className="mb-8 space-y-5">
        <div
          aria-label="Featured summary cards"
          data-summary-row="featured"
          role="group"
          className="
            grid gap-5
            lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]
          "
        >
          <SummaryTile
            title="Days Since Last Game"
            description="How long it has been since the latest recorded session."
          >
            <RecentActivityCard latestPlayedAt={activitySummary.latestPlayedAt} />
          </SummaryTile>

          <SummaryTile
            title="Reigning Champion"
            description="Winner of the most recent recorded game."
          >
            {reigningChampion && reigningChampion.winners.length > 0 ? (
              <div className="space-y-3">
                <p className="
                  font-cinzel text-4xl leading-none font-semibold tracking-wide
                  text-(--gold)
                ">
                  {formatNameList(reigningChampion.winners.map((winner) => winner.name))}
                </p>
                <div className="text-sm text-(--cream)/55">
                  <p>Latest recorded game</p>
                  <FormattedDate iso={reigningChampion.playedAt} className="
                    mt-1 block text-(--cream)/70
                  " />
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-(--cream)/50">
                No games recorded yet.
              </p>
            )}
          </SummaryTile>
        </div>

        <div
          aria-label="Secondary summary cards"
          data-summary-row="secondary"
          role="group"
          className="
            grid gap-5
            md:grid-cols-2
            lg:grid-cols-3
          "
        >
          <SummaryTile
            title="Current Win Streak Leader"
            description="Longest active streak based on each player’s own game history."
          >
            <CurrentWinStreakLeaderCard currentWinStreaks={currentWinStreaks} />
          </SummaryTile>

          <SummaryTile
            title="Hot Hand"
            description="Players with 3 or more wins in their last 5 games."
          >
            <HotHandIndicatorCard hotHand={hotHandIndicators} />
          </SummaryTile>

          <SummaryTile
            title="Player of the Month"
            description="Most wins in the current local calendar month."
          >
            <PlayerOfMonthCard players={currentWinStreaks} winEvents={playerWinEvents} />
          </SummaryTile>
        </div>
      </div>

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
    </PageWidth>
  )
}
