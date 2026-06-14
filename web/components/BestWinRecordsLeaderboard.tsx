'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import {
  buildPlayerBestMonthWinRecords,
  buildPlayerBestWeekWinRecords,
} from '@/lib/activity-local-time'
import { PlayerTier } from '@/lib/player-tier'
import type { PlayerCurrentWinStreak, PlayerWinEvent } from '@/lib/stats'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'
import { StatsLeaderboardTable, type StatsTableRow } from './StatsLeaderboardTable'

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

  let rows: StatsTableRow[] = []
  let emptyState: ReactNode = null

  if (winEvents.length === 0) {
    emptyState = 'No wins recorded yet.'
  } else if (!records) {
    emptyState = localTimeLoadingMessage
  } else {
    rows = records.map((player) => ({
      key: player.playerId,
      sortValues: { player: player.name, wins: player.wins, period: player.periodLabel ?? null },
      cells: (
        <>
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
        </>
      ),
    }))
  }

  return (
    <StatsLeaderboardTable
      columns={[
        { label: '#', align: 'center', widthClass: 'w-10', rank: true },
        { label: 'Player', sortKey: 'player', sortType: 'string' },
        { label: 'Wins', align: 'right', sortKey: 'wins' },
        { label: 'Period', align: 'right', sortKey: 'period', sortType: 'string' },
      ]}
      rows={rows}
      initialSort={{ key: 'wins', direction: 'desc' }}
      rowVariant="subtle"
      emptyState={emptyState}
    />
  )
}
