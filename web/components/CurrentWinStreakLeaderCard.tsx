'use client'

import { Info } from 'lucide-react'
import type { PlayerCurrentWinStreak } from '@/lib/stats'
import { isWithinRecentLocalCalendarDays } from '@/lib/activity-local-time'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'

interface CurrentWinStreakLeaderCardProps {
  currentWinStreaks: PlayerCurrentWinStreak[]
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
  return <p className="py-8 text-center text-sm text-(--cream)/50">No active win streaks yet.</p>
}

function EligibilityTooltip() {
  return (
    <span className="relative inline-flex items-center">
      <button
        type="button"
        aria-label="Current win streak eligibility info"
        className="
          group inline-flex size-5 items-center justify-center rounded-full
          text-(--cream)/45 transition-colors
          hover:text-(--gold)
          focus:text-(--gold) focus:outline-none
        "
      >
        <Info className="size-3.5" />
        <span
          role="tooltip"
          className="
            pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 w-52
            -translate-x-1/2 rounded-lg border border-(--gold)/20
            bg-(--navy-900) px-3 py-2 text-center text-xs/snug text-(--cream)
            opacity-0 shadow-[0_12px_24px_rgba(0,0,0,0.28)] transition-opacity
            group-hover:opacity-100
            group-focus:opacity-100
          "
        >
          To be eligible, a player must have played a game in the last 7 days.
        </span>
      </button>
    </span>
  )
}

export function CurrentWinStreakLeaderCard({
  currentWinStreaks,
  timeZone,
  now,
}: CurrentWinStreakLeaderCardProps) {
  const resolvedTimeZone = useResolvedTimeZone(timeZone)
  const positiveStreaks = currentWinStreaks.filter((player) => player.streak > 0)

  if (positiveStreaks.length === 0) {
    return <EmptyState />
  }

  if (!resolvedTimeZone) {
    return <p className="text-sm text-(--cream)/55">{localTimeLoadingMessage}</p>
  }

  const eligibleStreaks = positiveStreaks.filter((player) => isWithinRecentLocalCalendarDays({
    iso: player.mostRecentAppearance,
    now: now ?? new Date(),
    timeZone: resolvedTimeZone,
    days: 7,
  }))
  const topStreak = eligibleStreaks[0]?.streak ?? 0
  const currentLeaders = topStreak > 0
    ? eligibleStreaks.filter((player) => player.streak === topStreak)
    : []

  if (currentLeaders.length === 0) {
    return <EmptyState />
  }

  return (
    <div className="space-y-3">
      <p className="
        font-cinzel text-4xl leading-none font-semibold tracking-wide
        text-(--gold)
      ">
        {formatNameList(currentLeaders.map((leader) => leader.name))}
      </p>
      <div className="flex items-center gap-2 text-sm text-(--cream)/55">
        <p>{formatWinsLabel(topStreak)}</p>
        <EligibilityTooltip />
      </div>
    </div>
  )
}

CurrentWinStreakLeaderCard.defaultProps = {
  timeZone: undefined,
  now: undefined,
}
