'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { buildPlayerOfMonthHistoryRecords } from '@/lib/activity-local-time'
import { PlayerTier } from '@/lib/player-tier'
import type { PlayerCurrentWinStreak, PlayerWinEvent } from '@/lib/stats'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'
import { StatsLeaderboardTable } from './StatsLeaderboardTable'

interface Props {
  players: PlayerCurrentWinStreak[]
  winEvents: PlayerWinEvent[]
  timeZone?: string
  now?: Date
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

  let content: ReactNode

  if (!records) {
    content = (
      <tr>
        <td colSpan={3} className="
          px-3 py-8 text-center text-sm text-(--cream)/50
        ">
          {localTimeLoadingMessage}
        </td>
      </tr>
    )
  } else if (records.length === 0) {
    content = (
      <tr>
        <td colSpan={3} className="
          px-3 py-8 text-center text-sm text-(--cream)/50
        ">
          No completed months yet.
        </td>
      </tr>
    )
  } else {
    content = records.map((record) => (
      <DataRow key={record.periodStart}>
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
      </DataRow>
    ))
  }

  return (
    <StatsLeaderboardTable
      columns={[
        { label: 'Month' },
        { label: 'Player' },
        { label: 'Wins', align: 'right' },
      ]}
    >
      {content}
    </StatsLeaderboardTable>
  )
}

PlayerOfMonthHistoryTable.defaultProps = {
  timeZone: undefined,
  now: undefined,
}
