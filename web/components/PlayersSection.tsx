import Link from 'next/link'
import { ArrowLeft, User } from 'lucide-react'
import { StatsCard } from '@/components/StatsCard'
import { formatAverage, formatPercent } from '@/lib/format'
import { PlayerTier } from '@/lib/player-tier'
import type { Player } from '@/lib/players'
import type {
  PlayerFinishBreakdown,
  PlayerMarginStats,
  PlayerPodiumRate,
  PlayerScoreStats,
} from '@/lib/stats'
import { PlayerProfileCard } from './PlayerProfileCard'

const cinzelStyle = {
  fontFamily: 'var(--font-cinzel), Georgia, serif',
}

interface Props {
  players: Player[]
  selectedPlayer: Player | null
  mobileMode: 'list' | 'detail'
  scoreStats: PlayerScoreStats[]
  podiumRates: PlayerPodiumRate[]
  finishBreakdowns: PlayerFinishBreakdown[]
  marginStats: PlayerMarginStats[]
}

interface PlayersListProps {
  players: Player[]
  selectedPlayerId: number | null
}

function PlayersList({ players, selectedPlayerId }: PlayersListProps) {
  return (
    <aside className="
      rounded-2xl border border-(--gold)/20 bg-(--navy-900)/40 p-4
      sm:p-5
    ">
      <div className="mb-4 border-b border-(--gold)/10 pb-3">
        <p style={cinzelStyle} className="
          text-xs tracking-[0.3em] text-(--cream)/40 uppercase
        ">
          Players
        </p>
        <h1 style={cinzelStyle} className="
          mt-2 text-xl tracking-wide text-(--gold)
        ">
          Select a player
        </h1>
      </div>

      <div className="space-y-2">
        {players.map((player) => {
          const active = player.id === selectedPlayerId

          return (
            <Link
              key={player.id}
              href={`/players/${player.id}`}
              aria-current={active ? 'page' : undefined}
              className={`
                flex items-center gap-3 rounded-xl border p-3 text-sm
                transition-colors
                ${
                active
                  ? `border-(--gold)/45 bg-(--gold)/10 text-(--gold)`
                  : `
                    border-transparent bg-(--navy-800)/35 text-(--cream)/70
                    hover:border-(--gold)/20 hover:text-(--cream)
                  `
              }
              `}
            >
              <div className="
                flex size-10 shrink-0 items-center justify-center rounded-full
                border border-(--gold)/20 bg-(--navy-900)/70
              ">
                <User className="size-4" />
              </div>
              <div className="min-w-0">
                <p
                  style={cinzelStyle}
                  className={`
                    truncate tracking-widest uppercase
                    ${
                    player.tier === PlayerTier.Premium ? 'text-(--gold)' : ''
                  }
                  `}
                >
                  {player.name}
                </p>
                <p className="
                  mt-1 text-[11px] tracking-[0.2em] text-(--cream)/35 uppercase
                ">
                  {player.tier === PlayerTier.Premium ? 'Premium' : 'Standard'}
                </p>
              </div>
            </Link>
          )
        })}
      </div>
    </aside>
  )
}

function EmptyMetricState() {
  return <p className="py-8 text-center text-sm text-(--cream)/50">No games recorded yet.</p>
}

interface ProfileMetricCardProps {
  id: string
  title: string
  description: string
  value: string | null
  detail: string | null
}

function ProfileMetricCard({ id, title, description, value, detail }: ProfileMetricCardProps) {
  return (
    <StatsCard id={id} title={title} description={description} badge={undefined} span="single">
      {value && detail ? (
        <div className="space-y-2">
          <p
            style={cinzelStyle}
            className="
              text-4xl leading-none font-semibold tracking-wide text-(--gold)
            "
          >
            {value}
          </p>
          <p className="text-sm text-(--cream)/55">{detail}</p>
        </div>
      ) : (
        <EmptyMetricState />
      )}
    </StatsCard>
  )
}

function formatCount(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`
}

function ProfileFinishBreakdownCard({ breakdown }: { breakdown: PlayerFinishBreakdown | null }) {
  return (
    <StatsCard
      id="player-finish-breakdown"
      title="Finish Breakdown"
      description="How often this player finished first, second, third, or last."
      badge={undefined}
      span="single"
    >
      {breakdown && breakdown.games > 0 ? (
        <div className="space-y-3">
          {[
            { label: '1st', rate: breakdown.firstRate, count: breakdown.firsts },
            { label: '2nd', rate: breakdown.secondRate, count: breakdown.seconds },
            { label: '3rd', rate: breakdown.thirdRate, count: breakdown.thirds },
            { label: 'Last', rate: breakdown.lastRate, count: breakdown.lasts },
          ].map((row) => (
            <div
              key={row.label}
              className="
                flex items-center justify-between gap-3 text-sm
                text-(--cream)/70
              "
            >
              <span className="tracking-wide text-(--cream)">{row.label}</span>
              <span className="text-(--gold) tabular-nums">
                {formatPercent(row.rate, 1)} ({row.count})
              </span>
            </div>
          ))}
        </div>
      ) : (
        <EmptyMetricState />
      )}
    </StatsCard>
  )
}

function PlayerDetail({
  player,
  scoreStats,
  podiumRates,
  finishBreakdowns,
  marginStats,
}: {
  player: Player
  scoreStats: PlayerScoreStats[]
  podiumRates: PlayerPodiumRate[]
  finishBreakdowns: PlayerFinishBreakdown[]
  marginStats: PlayerMarginStats[]
}) {
  const scoreStat = scoreStats.find((candidate) => candidate.playerId === player.id) ?? null
  const podiumStat = podiumRates.find((candidate) => candidate.playerId === player.id) ?? null
  const finishBreakdown = finishBreakdowns.find((candidate) => candidate.playerId === player.id) ?? null
  const marginStat = marginStats.find((candidate) => candidate.playerId === player.id) ?? null

  const hasGames = scoreStat !== null && scoreStat.games > 0
  const podiumHasGames = podiumStat !== null && podiumStat.games > 0
  const victoryMarginValue = marginStat?.averageVictoryMargin ?? null
  const defeatMarginValue = marginStat?.averageDefeatMargin ?? null

  return (
    <div className="space-y-5">
      <PlayerProfileCard player={player} />
      <div className="
        grid grid-cols-1 gap-5
        lg:grid-cols-3
      ">
        <ProfileMetricCard
          id="player-avg-score"
          title="Average Score"
          description="Mean score across all recorded games."
          value={hasGames ? formatAverage(scoreStat.avgScore) : null}
          detail={hasGames ? `Across ${formatCount(scoreStat.games, 'game')}` : null}
        />
        <ProfileMetricCard
          id="player-median-score"
          title="Median Score"
          description="Middle score to smooth out unusually high or low games."
          value={hasGames ? formatAverage(scoreStat.medianScore) : null}
          detail={hasGames ? `Across ${formatCount(scoreStat.games, 'game')}` : null}
        />
        <ProfileMetricCard
          id="player-podium-rate"
          title="Podium Rate"
          description="Share of games finished in first or second place."
          value={podiumHasGames ? formatPercent(podiumStat.podiumRate, 1) : null}
          detail={
            podiumHasGames
              ? `${formatCount(podiumStat.podiums, 'podium')} in ${formatCount(
                  podiumStat.games,
                  'game',
                )}`
              : null
          }
        />
        <ProfileFinishBreakdownCard breakdown={finishBreakdown} />
        <ProfileMetricCard
          id="player-average-margin-of-victory"
          title="Average Margin of Victory"
          description="Mean score gap over the best non-winner in games this player won."
          value={victoryMarginValue !== null ? formatAverage(victoryMarginValue) : null}
          detail={
            marginStat !== null && victoryMarginValue !== null
              ? `Across ${formatCount(marginStat.winGames, 'win')}`
              : null
          }
        />
        <ProfileMetricCard
          id="player-average-margin-of-defeat"
          title="Average Margin of Defeat"
          description="Mean gap between this player and the best recorded winner in games they lost."
          value={defeatMarginValue !== null ? formatAverage(defeatMarginValue) : null}
          detail={
            marginStat !== null && defeatMarginValue !== null
              ? `Across ${formatCount(marginStat.lossGames, 'loss', 'losses')}`
              : null
          }
        />
      </div>
    </div>
  )
}

function PlayersDetailEmptyState() {
  return (
    <div className="
      flex min-h-full items-center justify-center rounded-xl border
      border-dashed border-(--gold)/15 bg-(--navy-900)/20 p-8
    ">
      <p className="text-center text-sm text-(--cream)/45">
        Choose a player to see their profile.
      </p>
    </div>
  )
}

export function PlayersSection({
  players,
  selectedPlayer,
  mobileMode,
  scoreStats,
  podiumRates,
  finishBreakdowns,
  marginStats,
}: Props) {
  if (players.length === 0) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="
          rounded-lg border border-(--gold)/30 bg-(--navy-900)/60 p-8
          text-center
        ">
          <h1 style={cinzelStyle} className="
            text-2xl tracking-wide text-(--gold)
          ">
            Players
          </h1>
          <p className="mt-4 text-sm text-(--cream)/70">No players yet.</p>
          <p className="mt-2 text-sm text-(--cream)/50">Add your first player in admin.</p>
        </div>
      </main>
    )
  }

  return (
    <main className="
      mx-auto max-w-6xl px-4 py-6
      sm:px-6 sm:py-10
    ">
      <div className="sm:hidden">
        {mobileMode === 'list' ? (
          <PlayersList players={players} selectedPlayerId={null} />
        ) : (
          <div className="space-y-4">
            <Link
              href="/players"
              style={cinzelStyle}
              className="
                inline-flex items-center gap-2 rounded-md border
                border-(--gold)/20 bg-(--navy-900)/40 px-3 py-2 text-xs
                tracking-widest text-(--cream)/70 uppercase transition-colors
                hover:border-(--gold)/40 hover:text-(--gold)
              "
            >
              <ArrowLeft className="size-4" />
              <span>Back to players</span>
            </Link>
            {selectedPlayer ? (
              <PlayerDetail
                player={selectedPlayer}
                scoreStats={scoreStats}
                podiumRates={podiumRates}
                finishBreakdowns={finishBreakdowns}
                marginStats={marginStats}
              />
            ) : null}
          </div>
        )}
      </div>

      <div className="
        hidden min-h-136
        sm:grid sm:grid-cols-[18rem_minmax(0,1fr)] sm:gap-6
      ">
        <PlayersList players={players} selectedPlayerId={selectedPlayer?.id ?? null} />
        <div className="
          rounded-2xl border border-(--gold)/20 bg-(--navy-900)/30 p-6
        ">
          {selectedPlayer ? (
            <PlayerDetail
              player={selectedPlayer}
              scoreStats={scoreStats}
              podiumRates={podiumRates}
              finishBreakdowns={finishBreakdowns}
              marginStats={marginStats}
            />
          ) : (
            <PlayersDetailEmptyState />
          )}
        </div>
      </div>
    </main>
  )
}
