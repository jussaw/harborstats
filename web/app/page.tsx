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
import { isGameSession } from '@/lib/game-auth'
import { CurrentWinStreakLeaderCard } from '@/components/CurrentWinStreakLeaderCard'
import { HotHandIndicatorCard } from '@/components/HotHandIndicatorCard'
import { GameCard } from '@/components/GameCard'
import { NewGameButton } from '@/components/NewGameButton'
import { PageWidth } from '@/components/PageWidth'
import { PlayerOfMonthCard } from '@/components/PlayerOfMonthCard'
import { FormattedDate } from '@/components/FormattedDate'
import { RecentActivityCard } from '@/components/RecentActivityCard'
import { buttonClasses } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

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
    <section>
      <Card title={title} description={description} className="h-full">
        {children}
      </Card>
    </section>
  )
}

function formatNameList(names: string[]) {
  return names.join(', ')
}

export default async function HomePage() {
  const [
    isUnlocked,
    games,
    players,
    activitySummary,
    reigningChampion,
    currentWinStreaks,
    playerWinEvents,
    hotHandIndicators,
  ] = await Promise.all([
    isGameSession(),
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
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <h1 className="font-cinzel text-2xl tracking-wide text-(--cream)">Recent Games</h1>
          <p className="mt-1 text-xs text-(--cream)/50">
            The latest voyages of the harbor crew
          </p>
        </div>
        <NewGameButton
          players={players}
          isUnlocked={isUnlocked}
          className={buttonClasses('primary')}
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
            <GameCard key={game.id} game={game} href />
          ))}
        </div>
      )}
    </PageWidth>
  )
}
