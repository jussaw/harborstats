'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import { buildPlayerCurrentMonthWinRecords } from '@/lib/activity-local-time'
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
  const hasWinsThisMonth = (records?.[0]?.wins ?? 0) > 0

  let rows: StatsTableRow[] = []
  let emptyState: ReactNode = null

  if (!records) {
    emptyState = localTimeLoadingMessage
  } else if (!hasWinsThisMonth) {
    emptyState = 'No wins recorded yet this month.'
  } else {
    rows = records.map((player) => ({
      key: player.playerId,
      sortValues: { player: player.name, wins: player.wins },
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
        </>
      ),
    }))
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
          { label: '#', align: 'center', widthClass: 'w-10', rank: true },
          { label: 'Player', sortKey: 'player', sortType: 'string' },
          { label: 'Wins', align: 'right', sortKey: 'wins' },
        ]}
        rows={rows}
        initialSort={{ key: 'wins', direction: 'desc' }}
        rowVariant="subtle"
        emptyState={emptyState}
      />
    </div>
  )
}
