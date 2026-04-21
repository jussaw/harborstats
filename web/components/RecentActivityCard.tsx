'use client'

import { useMemo } from 'react'
import { getDaysSinceLastGame } from '@/lib/activity-local-time'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'
import { FormattedDate } from '@/components/FormattedDate'

interface Props {
  latestPlayedAt: string | null
  timeZone?: string
  now?: Date
}

export function RecentActivityCard({ latestPlayedAt, timeZone, now }: Props) {
  const resolvedTimeZone = useResolvedTimeZone(timeZone)
  const daysSinceLastGame = useMemo(() => {
    if (!latestPlayedAt || !resolvedTimeZone) {
      return null
    }

    return getDaysSinceLastGame({
      latestPlayedAtIso: latestPlayedAt,
      now: now ?? new Date(),
      timeZone: resolvedTimeZone,
    })
  }, [latestPlayedAt, now, resolvedTimeZone])

  if (!latestPlayedAt) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">No games recorded yet.</p>
  }

  return (
    <div className="space-y-2">
      {daysSinceLastGame === null ? (
        <p className="text-sm text-(--cream)/55">{localTimeLoadingMessage}</p>
      ) : (
        <p
          className="
            font-cinzel text-5xl leading-none font-semibold tracking-wide
            text-(--gold)
          "
        >
          {daysSinceLastGame}
        </p>
      )}
      <div className="text-sm text-(--cream)/55">
        <p>Latest recorded game</p>
        <FormattedDate iso={latestPlayedAt} className="mt-1 block text-(--cream)/70" />
      </div>
    </div>
  )
}
