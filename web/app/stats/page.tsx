import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import { StatsCard } from '@/components/StatsCard'
import { StatsLeaderboardTable } from '@/components/StatsLeaderboardTable'
import { formatAverage, formatPercent } from '@/lib/format'
import { PlayerTier } from '@/lib/player-tier'
import { rankWithTies } from '@/lib/rank'
import { getSettings } from '@/lib/settings'
import {
  getPlayerFinishBreakdowns,
  getPlayerPodiumRates,
  getPlayerScoreStats,
  getPlayerWinRates,
} from '@/lib/stats'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { title: 'Stats — HarborStats' }

interface StatsCardMeta {
  id: string
  title: string
  description: string
  badge: string | undefined
  span: 'single' | 'full'
}

function PlayerName({ name, tier }: { name: string; tier: PlayerTier }) {
  return (
    <div className="min-w-0">
      <span className={tier === PlayerTier.Premium ? `
        font-semibold text-(--gold)
      ` : ''}>
        {name}
      </span>
      {tier === PlayerTier.Premium && (
        <span className="
          ml-2 hidden rounded-sm bg-(--gold)/15 px-1 py-0.5 text-xs
          tracking-widest text-(--gold) uppercase
          sm:inline-block
        ">
          Premium
        </span>
      )}
    </div>
  )
}

function RankCell({ rank }: { rank: number }) {
  return (
    <td className="px-3 py-2 text-center text-(--cream)/50 tabular-nums">
      {rank === 1 ? '👑' : rank}
    </td>
  )
}

function DataRow({ children }: { children: ReactNode }) {
  return (
    <tr className="
      border-b border-(--gold)/10 bg-(--navy-900)/35 transition-colors
      last:border-0
      hover:bg-(--navy-900)/70
    ">
      {children}
    </tr>
  )
}

function EmptyState({ children }: { children: ReactNode }) {
  return <p className="py-8 text-center text-sm text-(--cream)/50">{children}</p>
}

export default async function StatsPage() {
  const [winRates, settings, scoreStats, podiumRates, finishBreakdowns] = await Promise.all([
    getPlayerWinRates(),
    getSettings(),
    getPlayerScoreStats(),
    getPlayerPodiumRates(),
    getPlayerFinishBreakdowns(),
  ])

  const winRateQualified = winRates
    .filter((player) => player.games >= settings.winRateMinGames)
    .sort((a, b) => b.winRate - a.winRate || b.wins - a.wins)

  const medianSorted = [...scoreStats].sort((a, b) => b.medianScore - a.medianScore)

  const totalWinsRanks = rankWithTies(winRates, (player) => player.wins)
  const winRateRanks = rankWithTies(winRateQualified, (player) => player.winRate)
  const avgScoreRanks = rankWithTies(scoreStats, (player) => player.avgScore)
  const medianScoreRanks = rankWithTies(medianSorted, (player) => player.medianScore)
  const podiumRateRanks = rankWithTies(podiumRates, (player) => player.podiumRate)
  const finishBreakdownRanks = rankWithTies(finishBreakdowns, (player) => player.firstRate)

  const statsCards: StatsCardMeta[] = [
    {
      id: 'total-wins',
      title: 'Total Wins',
      description: 'All-time victory leaderboard with win rate alongside total finishes.',
      badge: undefined,
      span: 'full',
    },
    {
      id: 'win-rate',
      title: 'Win Rate',
      description: 'Qualified players ranked by share of games won.',
      badge:
        settings.winRateMinGames > 0
          ? `Min ${settings.winRateMinGames} game${settings.winRateMinGames === 1 ? '' : 's'}`
          : undefined,
      span: 'full',
    },
    {
      id: 'avg-score',
      title: 'Average Score',
      description: 'Scoring leaderboard ranked by each player’s all-time average.',
      badge: undefined,
      span: 'single',
    },
    {
      id: 'median-score',
      title: 'Median Score',
      description: 'Typical scoring performance with median values to smooth out spikes.',
      badge: undefined,
      span: 'single',
    },
    {
      id: 'podium-rate',
      title: 'Podium Rate',
      description: 'How often each player finishes first or second.',
      badge: undefined,
      span: 'single',
    },
    {
      id: 'finish-breakdown',
      title: 'Finish Breakdown',
      description: 'Share of games each player finished first, second, third, or last.',
      badge: undefined,
      span: 'full',
    },
  ]

  const cardById = Object.fromEntries(statsCards.map((card) => [card.id, card])) as Record<
    string,
    StatsCardMeta
  >

  return (
    <main className="
      mx-auto max-w-7xl px-4 py-6
      sm:px-6 sm:py-8
    ">
      <div className="
        grid grid-cols-1 gap-5
        lg:grid-cols-2
      ">
        <StatsCard {...cardById['total-wins']}>
            {winRates.length === 0 ? (
              <EmptyState>No wins recorded yet.</EmptyState>
            ) : (
              <StatsLeaderboardTable
                columns={[
                  { label: '#', align: 'center', widthClass: 'w-10' },
                  { label: 'Player' },
                  { label: 'Wins', align: 'right' },
                  { label: 'Win Rate', align: 'right' },
                ]}
              >
                {winRates.map((player, index) => (
                  <DataRow key={player.playerId}>
                    <RankCell rank={totalWinsRanks[index]} />
                    <td className="px-3 py-2 text-(--cream)">
                      <PlayerName name={player.name} tier={player.tier} />
                    </td>
                    <td className="
                      px-3 py-2 text-right text-(--cream) tabular-nums
                    ">
                      {player.wins}
                    </td>
                    <td className="
                      px-3 py-2 text-right text-(--cream)/70 tabular-nums
                    ">
                      {formatPercent(player.winRate, 1)}
                    </td>
                  </DataRow>
                ))}
              </StatsLeaderboardTable>
            )}
        </StatsCard>

        <StatsCard {...cardById['win-rate']}>
            {winRateQualified.length === 0 ? (
              <EmptyState>
                No players have played {settings.winRateMinGames}+ game
                {settings.winRateMinGames === 1 ? '' : 's'} yet.
              </EmptyState>
            ) : (
              <StatsLeaderboardTable
                columns={[
                  { label: '#', align: 'center', widthClass: 'w-10' },
                  { label: 'Player' },
                  { label: 'Win Rate', align: 'right' },
                  { label: 'Wins', align: 'right' },
                  { label: 'Games', align: 'right' },
                ]}
              >
                {winRateQualified.map((player, index) => (
                  <DataRow key={player.playerId}>
                    <RankCell rank={winRateRanks[index]} />
                    <td className="px-3 py-2 text-(--cream)">
                      <PlayerName name={player.name} tier={player.tier} />
                    </td>
                    <td className="
                      px-3 py-2 text-right font-semibold text-(--gold)
                      tabular-nums
                    ">
                      {formatPercent(player.winRate, 1)}
                    </td>
                    <td className="
                      px-3 py-2 text-right text-(--cream) tabular-nums
                    ">
                      {player.wins}
                    </td>
                    <td className="
                      px-3 py-2 text-right text-(--cream)/70 tabular-nums
                    ">
                      {player.games}
                    </td>
                  </DataRow>
                ))}
              </StatsLeaderboardTable>
            )}
        </StatsCard>

        <StatsCard {...cardById['avg-score']}>
            {scoreStats.length === 0 ? (
              <EmptyState>No games recorded yet.</EmptyState>
            ) : (
              <StatsLeaderboardTable
                columns={[
                  { label: '#', align: 'center', widthClass: 'w-10' },
                  { label: 'Player' },
                  { label: 'Avg Score', align: 'right' },
                  { label: 'Games', align: 'right' },
                ]}
              >
                {scoreStats.map((player, index) => (
                  <DataRow key={player.playerId}>
                    <RankCell rank={avgScoreRanks[index]} />
                    <td className="px-3 py-2 text-(--cream)">
                      <PlayerName name={player.name} tier={player.tier} />
                    </td>
                    <td className="
                      px-3 py-2 text-right font-semibold text-(--gold)
                      tabular-nums
                    ">
                      {formatAverage(player.avgScore)}
                    </td>
                    <td className="
                      px-3 py-2 text-right text-(--cream)/70 tabular-nums
                    ">
                      {player.games}
                    </td>
                  </DataRow>
                ))}
              </StatsLeaderboardTable>
            )}
        </StatsCard>

        <StatsCard {...cardById['median-score']}>
            {medianSorted.length === 0 ? (
              <EmptyState>No games recorded yet.</EmptyState>
            ) : (
              <StatsLeaderboardTable
                columns={[
                  { label: '#', align: 'center', widthClass: 'w-10' },
                  { label: 'Player' },
                  { label: 'Median Score', align: 'right' },
                  { label: 'Games', align: 'right' },
                ]}
              >
                {medianSorted.map((player, index) => (
                  <DataRow key={player.playerId}>
                    <RankCell rank={medianScoreRanks[index]} />
                    <td className="px-3 py-2 text-(--cream)">
                      <PlayerName name={player.name} tier={player.tier} />
                    </td>
                    <td className="
                      px-3 py-2 text-right font-semibold text-(--gold)
                      tabular-nums
                    ">
                      {formatAverage(player.medianScore)}
                    </td>
                    <td className="
                      px-3 py-2 text-right text-(--cream)/70 tabular-nums
                    ">
                      {player.games}
                    </td>
                  </DataRow>
                ))}
              </StatsLeaderboardTable>
            )}
        </StatsCard>

        <StatsCard {...cardById['podium-rate']}>
            {podiumRates.length === 0 ? (
              <EmptyState>No games recorded yet.</EmptyState>
            ) : (
              <StatsLeaderboardTable
                columns={[
                  { label: '#', align: 'center', widthClass: 'w-10' },
                  { label: 'Player' },
                  { label: 'Podium Rate', align: 'right' },
                  { label: 'Podiums', align: 'right' },
                  { label: 'Games', align: 'right' },
                ]}
              >
                {podiumRates.map((player, index) => (
                  <DataRow key={player.playerId}>
                    <RankCell rank={podiumRateRanks[index]} />
                    <td className="px-3 py-2 text-(--cream)">
                      <PlayerName name={player.name} tier={player.tier} />
                    </td>
                    <td className="
                      px-3 py-2 text-right font-semibold text-(--gold)
                      tabular-nums
                    ">
                      {formatPercent(player.podiumRate, 1)}
                    </td>
                    <td className="
                      px-3 py-2 text-right text-(--cream) tabular-nums
                    ">
                      {player.podiums}
                    </td>
                    <td className="
                      px-3 py-2 text-right text-(--cream)/70 tabular-nums
                    ">
                      {player.games}
                    </td>
                  </DataRow>
                ))}
              </StatsLeaderboardTable>
            )}
        </StatsCard>

        <StatsCard {...cardById['finish-breakdown']}>
            {finishBreakdowns.length === 0 ? (
              <EmptyState>No games recorded yet.</EmptyState>
            ) : (
              <StatsLeaderboardTable
                columns={[
                  { label: '#', align: 'center', widthClass: 'w-10' },
                  { label: 'Player' },
                  { label: '1st', align: 'right' },
                  { label: '2nd', align: 'right' },
                  { label: '3rd', align: 'right' },
                  { label: 'Last', align: 'right' },
                  { label: 'Games', align: 'right' },
                ]}
              >
                {finishBreakdowns.map((player, index) => (
                  <DataRow key={player.playerId}>
                    <RankCell rank={finishBreakdownRanks[index]} />
                    <td className="px-3 py-2 text-(--cream)">
                      <PlayerName name={player.name} tier={player.tier} />
                    </td>
                    <td className="
                      px-3 py-2 text-right font-semibold text-(--gold)
                      tabular-nums
                    ">
                      {formatPercent(player.firstRate, 1)}
                    </td>
                    <td className="
                      px-3 py-2 text-right text-(--cream) tabular-nums
                    ">
                      {formatPercent(player.secondRate, 1)}
                    </td>
                    <td className="
                      px-3 py-2 text-right text-(--cream) tabular-nums
                    ">
                      {formatPercent(player.thirdRate, 1)}
                    </td>
                    <td className="
                      px-3 py-2 text-right text-(--cream) tabular-nums
                    ">
                      {formatPercent(player.lastRate, 1)}
                    </td>
                    <td className="
                      px-3 py-2 text-right text-(--cream)/70 tabular-nums
                    ">
                      {player.games}
                    </td>
                  </DataRow>
                ))}
              </StatsLeaderboardTable>
            )}
        </StatsCard>
      </div>
    </main>
  )
}
