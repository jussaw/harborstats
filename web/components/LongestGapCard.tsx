'use client'

import { useMemo } from 'react'
import { buildLongestGameGap } from '@/lib/activity-local-time'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'

interface Props {
  playedAtIsos: string[]
  timeZone?: string
}

function formatIdleDayLabel(idleDays: number) {
  return `idle day${idleDays === 1 ? '' : 's'}`
}

export function LongestGapCard({ playedAtIsos, timeZone = undefined }: Props) {
  const resolvedTimeZone = useResolvedTimeZone(timeZone)
  const longestGap = useMemo(() => {
    if (!resolvedTimeZone) {
      return null
    }

    return buildLongestGameGap({
      playedAtIsos,
      timeZone: resolvedTimeZone,
    })
  }, [playedAtIsos, resolvedTimeZone])

  if (playedAtIsos.length === 0) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">No games recorded yet.</p>
  }

  if (!resolvedTimeZone) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">{localTimeLoadingMessage}</p>
  }

  if (!longestGap) {
    return (
      <div className="flex min-h-40 items-center justify-center">
        <p className="text-center text-sm text-(--cream)/50">
          Need at least two games to calculate a gap.
        </p>
      </div>
    )
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
          {longestGap.idleDays}
        </p>
        <p className="mt-2 text-sm text-(--cream)/60">
          {formatIdleDayLabel(longestGap.idleDays)}
        </p>
      </div>

      <div className="space-y-1 text-sm text-(--cream)/60">
        <div>
          <p className="
            text-xs font-semibold tracking-[0.22em] text-(--cream)/45 uppercase
          ">
            Gap Started
          </p>
          <p className="mt-1 text-(--cream)/60">{longestGap.startLabel}</p>
        </div>
        <div>
          <p className="
            text-xs font-semibold tracking-[0.22em] text-(--cream)/45 uppercase
          ">
            Next Game
          </p>
          <p className="mt-1 text-(--cream)/60">{longestGap.endLabel}</p>
        </div>
      </div>
    </div>
  )
}

LongestGapCard.defaultProps = {
  timeZone: undefined,
}
