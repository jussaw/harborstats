'use client'

import { useMemo } from 'react'
import { buildPlayerCurrentMonthWinRecords } from '@/lib/activity-local-time'
import type { PlayerCurrentWinStreak, PlayerWinEvent } from '@/lib/stats'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'

interface PlayerOfMonthCardProps {
  players: PlayerCurrentWinStreak[]
  winEvents: PlayerWinEvent[]
  timeZone?: string
  now?: Date
}

function formatNameList(names: string[]) {
  return names.join(', ')
}

function formatWinsLabel(count: number) {
  return `${count} win${count === 1 ? '' : 's'}`
}

function EmptyState() {
  return <p className="py-8 text-center text-sm text-(--cream)/50">No wins recorded yet this month.</p>
}

export function PlayerOfMonthCard({
  players,
  winEvents,
  timeZone,
  now,
}: PlayerOfMonthCardProps) {
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

  if (!resolvedTimeZone || !records) {
    return <p className="text-sm text-(--cream)/55">{localTimeLoadingMessage}</p>
  }

  const topWins = records[0]?.wins ?? 0

  if (topWins <= 0) {
    return <EmptyState />
  }

  const leaders = records.filter((player) => player.wins === topWins)

  return (
    <div className="space-y-3">
      <p className="
        font-cinzel text-4xl leading-none font-semibold tracking-wide
        text-(--gold)
      ">
        {formatNameList(leaders.map((leader) => leader.name))}
      </p>
      <div className="text-sm text-(--cream)/55">
        <p>{formatWinsLabel(topWins)}</p>
        <p className="mt-1 text-(--cream)/70">{records[0]?.periodLabel}</p>
      </div>
    </div>
  )
}

PlayerOfMonthCard.defaultProps = {
  timeZone: undefined,
  now: undefined,
}
