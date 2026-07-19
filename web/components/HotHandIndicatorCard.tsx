'use client'

import { Info } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
import type { PlayerHotHandIndicator } from '@/lib/stats'
import { isWithinRecentLocalCalendarDays } from '@/lib/activity-local-time'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'

interface HotHandIndicatorCardProps {
  hotHand: PlayerHotHandIndicator[]
  timeZone?: string
  now?: Date
}

function formatNameList(names: string[]) {
  return names.join(', ')
}

function EmptyState() {
  return <p className="py-8 text-center text-sm text-(--cream)/50">No players are running hot right now.</p>
}

function EligibilityTooltip() {
  return (
    <Tooltip
      content="To be eligible, a player must have played in the last 7 days and have at least 5 recorded games."
      widthClass="w-56"
    >
      <button
        type="button"
        aria-label="Hot hand eligibility info"
        className="
          inline-flex size-5 items-center justify-center rounded-full
          text-(--cream)/45 transition-colors
          hover:text-(--gold)
          focus:text-(--gold) focus:outline-none
        "
      >
        <Info className="size-3.5" />
      </button>
    </Tooltip>
  )
}

export function HotHandIndicatorCard({
  hotHand,
  timeZone,
  now,
}: HotHandIndicatorCardProps) {
  const resolvedTimeZone = useResolvedTimeZone(timeZone)

  if (!resolvedTimeZone) {
    return <p className="text-sm text-(--cream)/55">{localTimeLoadingMessage}</p>
  }

  const eligiblePlayers = hotHand.filter((player) => player.gamesInLast5 >= 5
    && player.winsInLast5 >= 3
    && isWithinRecentLocalCalendarDays({
      iso: player.mostRecentAppearance,
      now: now ?? new Date(),
      timeZone: resolvedTimeZone,
      days: 7,
    }))
  const topWins = eligiblePlayers[0]?.winsInLast5 ?? 0
  const leaders = topWins > 0
    ? eligiblePlayers.filter((player) => player.winsInLast5 === topWins)
    : []

  if (leaders.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-3">
      <p className="
        font-cinzel text-4xl leading-none font-semibold tracking-wide
        text-(--gold)
      ">
        {formatNameList(leaders.map((leader) => leader.name))}
      </p>
      <div className="flex items-center gap-2 text-sm text-(--cream)/55">
        <p>{topWins} of last 5</p>
        <EligibilityTooltip />
      </div>
    </div>
  )
}
