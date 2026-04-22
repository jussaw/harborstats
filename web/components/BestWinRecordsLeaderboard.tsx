'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import {
  buildPlayerBestMonthWinRecords,
  buildPlayerBestWeekWinRecords,
} from '@/lib/activity-local-time'
import { PlayerTier } from '@/lib/player-tier'
import type { PlayerCurrentWinStreak, PlayerWinEvent } from '@/lib/stats'
import { rankWithTies } from '@/lib/rank'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'
import { StatsLeaderboardTable } from './StatsLeaderboardTable'

interface Props {
  players: PlayerCurrentWinStreak[]
  winEvents: PlayerWinEvent[]
  variant: 'week' | 'month'
  timeZone?: string
}

function PlayerName({ name, tier }: { name: string; tier: PlayerTier }) {
  return (
    <div className="min-w-0">
      <span
        className={
          tier === PlayerTier.Premium
            ? 'font-semibold text-(--gold)'
            : ''
        }
      >
        {name}
      </span>
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
    <tr
      className="
        border-b border-(--gold)/10 bg-(--navy-900)/35 transition-colors
        last:border-0
        hover:bg-(--navy-900)/70
      "
    >
      {children}
    </tr>
  )
}

export function BestWinRecordsLeaderboard({
  players,
  winEvents,
  variant,
  timeZone = undefined,
}: Props) {
  const resolvedTimeZone = useResolvedTimeZone(timeZone)
  const records = useMemo(() => {
    if (!resolvedTimeZone) {
      return null
    }

    if (variant === 'week') {
      return buildPlayerBestWeekWinRecords({
        players,
        winEvents,
        timeZone: resolvedTimeZone,
      })
    }

    return buildPlayerBestMonthWinRecords({
      players,
      winEvents,
      timeZone: resolvedTimeZone,
    })
  }, [players, resolvedTimeZone, variant, winEvents])
  const ranks = records ? rankWithTies(records, (row) => row.wins) : null
  let content: ReactNode

  if (winEvents.length === 0) {
    content = (
      <tr>
        <td
          colSpan={4}
          className="px-3 py-8 text-center text-sm text-(--cream)/50"
        >
          No wins recorded yet.
        </td>
      </tr>
    )
  } else if (!records) {
    content = (
      <tr>
        <td
          colSpan={4}
          className="px-3 py-8 text-center text-sm text-(--cream)/50"
        >
          {localTimeLoadingMessage}
        </td>
      </tr>
    )
  } else {
    content = records.map((player, index) => (
      <DataRow key={player.playerId}>
        <RankCell rank={ranks?.[index] ?? index + 1} />
        <td className="px-3 py-2 text-(--cream)">
          <PlayerName name={player.name} tier={player.tier} />
        </td>
        <td
          className="
            px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
          "
        >
          {player.wins}
        </td>
        <td className="px-3 py-2 text-right text-(--cream)/70">
          {player.periodLabel ?? '—'}
        </td>
      </DataRow>
    ))
  }

  return (
    <StatsLeaderboardTable
      columns={[
        { label: '#', align: 'center', widthClass: 'w-10' },
        { label: 'Player' },
        { label: 'Wins', align: 'right' },
        { label: 'Period', align: 'right' },
      ]}
    >
      {content}
    </StatsLeaderboardTable>
  )
}

BestWinRecordsLeaderboard.defaultProps = {
  timeZone: undefined,
}
