'use client'

import { Info } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'
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
    <Tooltip
      content="To be eligible, a player must have played a game in the last 7 days."
      widthClass="w-52"
    >
      <button
        type="button"
        aria-label="Current win streak eligibility info"
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
