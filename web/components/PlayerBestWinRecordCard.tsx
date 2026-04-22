'use client'

import type { ReactNode } from 'react'
import { useMemo } from 'react'
import {
  buildPlayerBestMonthWinRecords,
  buildPlayerBestWeekWinRecords,
} from '@/lib/activity-local-time'
import type { PlayerCurrentWinStreak, PlayerWinEvent } from '@/lib/stats'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'
import { StatsCard } from './StatsCard'

const cinzelStyle = {
  fontFamily: 'var(--font-cinzel), Georgia, serif',
}

interface Props {
  id: string
  title: string
  description: string
  variant: 'week' | 'month'
  players: PlayerCurrentWinStreak[]
  winEvents: PlayerWinEvent[]
  selectedPlayerId: number
  timeZone?: string
}

export function PlayerBestWinRecordCard({
  id,
  title,
  description,
  variant,
  players,
  winEvents,
  selectedPlayerId,
  timeZone = undefined,
}: Props) {
  const resolvedTimeZone = useResolvedTimeZone(timeZone)
  const record = useMemo(() => {
    if (!resolvedTimeZone) {
      return null
    }

    const records = variant === 'week'
      ? buildPlayerBestWeekWinRecords({
        players,
        winEvents,
        timeZone: resolvedTimeZone,
      })
      : buildPlayerBestMonthWinRecords({
        players,
        winEvents,
        timeZone: resolvedTimeZone,
      })

    return records.find((player) => player.playerId === selectedPlayerId) ?? null
  }, [players, resolvedTimeZone, selectedPlayerId, variant, winEvents])
  let content: ReactNode

  if (winEvents.length === 0) {
    content = <p className="py-8 text-center text-sm text-(--cream)/50">No games recorded yet.</p>
  } else if (!record) {
    content = <p className="py-8 text-center text-sm text-(--cream)/50">{localTimeLoadingMessage}</p>
  } else if (record.wins > 0 && record.periodLabel) {
    content = (
      <div className="space-y-2">
        <p
          style={cinzelStyle}
          className="
            text-4xl leading-none font-semibold tracking-wide text-(--gold)
          "
        >
          {record.wins}
        </p>
        <p className="text-sm text-(--cream)/55">{record.periodLabel}</p>
      </div>
    )
  } else {
    content = <p className="py-8 text-center text-sm text-(--cream)/50">No games recorded yet.</p>
  }

  return (
    <StatsCard id={id} title={title} description={description} badge={undefined} span="single">
      {content}
    </StatsCard>
  )
}

PlayerBestWinRecordCard.defaultProps = {
  timeZone: undefined,
}
