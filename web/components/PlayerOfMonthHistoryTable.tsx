'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { buildPlayerOfMonthHistoryRecords } from '@/lib/activity-local-time'
import { PlayerTier } from '@/lib/player-tier'
import type { PlayerCurrentWinStreak, PlayerWinEvent } from '@/lib/stats'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'
import { StatsLeaderboardTable, type StatsTableRow } from './StatsLeaderboardTable'

interface Props {
  players: PlayerCurrentWinStreak[]
  winEvents: PlayerWinEvent[]
  timeZone?: string
  now?: Date
}

export function PlayerOfMonthHistoryTable({
  players,
  winEvents,
  timeZone = undefined,
  now = undefined,
}: Props) {
  const resolvedTimeZone = useResolvedTimeZone(timeZone)
  const records = useMemo(() => {
    if (!resolvedTimeZone) return null
    return buildPlayerOfMonthHistoryRecords({
      players,
      winEvents,
      now: now ?? new Date(),
      timeZone: resolvedTimeZone,
    })
  }, [players, winEvents, resolvedTimeZone, now])

  let rows: StatsTableRow[] = []
  let emptyState: ReactNode = null

  if (!records) {
    emptyState = localTimeLoadingMessage
  } else if (records.length === 0) {
    emptyState = 'No completed months yet.'
  } else {
    rows = records.map((record) => ({
      key: record.periodStart,
      sortValues: {
        month: record.periodStart,
        player: record.winners.map((winner) => winner.name).join(' & '),
        wins: record.wins,
      },
      cells: (
        <>
          <td className="px-3 py-2 text-(--cream)/70">{record.periodLabel}</td>
          <td className="px-3 py-2 text-(--cream)">
            {record.winners.map((winner, idx) => (
              <span key={winner.playerId}>
                {idx > 0 && <span className="text-(--cream)/50"> &amp; </span>}
                <span
                  className={
                    winner.tier === PlayerTier.Premium ? `
                      font-semibold text-(--gold)
                    ` : ''
                  }
                >
                  {winner.name}
                </span>
              </span>
            ))}
          </td>
          <td className="
            px-3 py-2 text-right font-semibold text-(--gold) tabular-nums
          ">
            {record.wins}
          </td>
        </>
      ),
    }))
  }

  return (
    <StatsLeaderboardTable
      columns={[
        { label: 'Month', sortKey: 'month', sortType: 'string', defaultDirection: 'desc' },
        { label: 'Player', sortKey: 'player', sortType: 'string' },
        { label: 'Wins', align: 'right', sortKey: 'wins' },
      ]}
      rows={rows}
      initialSort={{ key: 'month', direction: 'desc' }}
      rowVariant="subtle"
      emptyState={emptyState}
    />
  )
}
