'use client'

import { useMemo } from 'react'
import { buildSessionSummary } from '@/lib/activity-local-time'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'

interface Props {
  playedAtIsos: string[]
  timeZone?: string
}

export function AverageGamesPerSessionCard({ playedAtIsos, timeZone }: Props) {
  const resolvedTimeZone = useResolvedTimeZone(timeZone)
  const summary = useMemo(() => {
    if (!resolvedTimeZone) {
      return null
    }

    return buildSessionSummary({ playedAtIsos, timeZone: resolvedTimeZone })
  }, [playedAtIsos, resolvedTimeZone])

  if (playedAtIsos.length === 0) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">No games recorded yet.</p>
  }

  if (!summary) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">{localTimeLoadingMessage}</p>
  }

  return (
    <div className="flex min-h-40 flex-col justify-between gap-4">
      <div>
        <p
          className="
            font-cinzel text-5xl leading-none font-semibold tracking-wide
            text-(--gold)
          "
        >
          {summary.averageGamesPerSession.toFixed(1)}
        </p>
      </div>
      <div className="space-y-1 text-sm text-(--cream)/60">
        <p>{summary.sessionCount} session{summary.sessionCount === 1 ? '' : 's'}</p>
        <p>{summary.totalGames} total game{summary.totalGames === 1 ? '' : 's'}</p>
        <p>Session = games played on the same local calendar day.</p>
      </div>
    </div>
  )
}

AverageGamesPerSessionCard.defaultProps = {
  timeZone: undefined,
}
