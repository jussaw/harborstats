'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { buildPlayerCurrentMonthWinRecords } from '@/lib/activity-local-time'
import { PlayerTier } from '@/lib/player-tier'
import { rankWithTies } from '@/lib/rank'
import type { PlayerCurrentWinStreak, PlayerWinEvent } from '@/lib/stats'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'
import { StatsLeaderboardTable } from './StatsLeaderboardTable'

interface Props {
  players: PlayerCurrentWinStreak[]
  winEvents: PlayerWinEvent[]
  timeZone?: string
  now?: Date
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

export function PlayerOfMonthLeaderboard({
  players,
  winEvents,
  timeZone = undefined,
  now = undefined,
}: Props) {
  const resolvedTimeZone = useResolvedTimeZone(timeZone)
  const records = useMemo(() => {
    if (!resolvedTimeZone) {
      return null
    }

    return buildPlayerCurrentMonthWinRecords({
      players,
      winEvents,
      now: now ?? new Date(),
      timeZone: resolvedTimeZone,
    })
  }, [now, players, resolvedTimeZone, winEvents])
  const monthLabel = records?.[0]?.periodLabel ?? null
  const ranks = records ? rankWithTies(records, (row) => row.wins) : null
  const hasWinsThisMonth = (records?.[0]?.wins ?? 0) > 0
  let content: ReactNode

  if (!records) {
    content = (
      <tr>
        <td
          colSpan={3}
          className="px-3 py-8 text-center text-sm text-(--cream)/50"
        >
          {localTimeLoadingMessage}
        </td>
      </tr>
    )
  } else if (!hasWinsThisMonth) {
    content = (
      <tr>
        <td
          colSpan={3}
          className="px-3 py-8 text-center text-sm text-(--cream)/50"
        >
          No wins recorded yet this month.
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
      </DataRow>
    ))
  }

  return (
    <div className="space-y-3">
      {monthLabel ? (
        <p className="
          text-right text-xs tracking-[0.25em] text-(--cream)/50 uppercase
        ">
          {monthLabel}
        </p>
      ) : null}
      <StatsLeaderboardTable
        columns={[
          { label: '#', align: 'center', widthClass: 'w-10' },
          { label: 'Player' },
          { label: 'Wins', align: 'right' },
        ]}
      >
        {content}
      </StatsLeaderboardTable>
    </div>
  )
}

PlayerOfMonthLeaderboard.defaultProps = {
  timeZone: undefined,
  now: undefined,
}
