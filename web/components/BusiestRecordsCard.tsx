'use client'

import { useMemo } from 'react'
import { buildBusiestActivityRecords } from '@/lib/activity-local-time'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'

interface Props {
  playedAtIsos: string[]
  timeZone?: string
}

function formatGameCount(count: number) {
  return `${count} game${count === 1 ? '' : 's'}`
}

function RecordRow({
  label,
  value,
  count,
}: {
  label: string
  value: string
  count: number
}) {
  return (
    <div
      className="
        flex items-center justify-between gap-4 border-b border-(--gold)/10 pb-3
        last:border-b-0 last:pb-0
      "
    >
      <div className="min-w-0">
        <p className="
          text-xs font-semibold tracking-[0.22em] text-(--cream)/45 uppercase
        ">
          {label}
        </p>
        <p className="mt-1 truncate text-sm text-(--cream)">{value}</p>
      </div>
      <p className="shrink-0 text-sm font-semibold text-(--gold) tabular-nums">
        {formatGameCount(count)}
      </p>
    </div>
  )
}

export function BusiestRecordsCard({ playedAtIsos, timeZone = undefined }: Props) {
  const resolvedTimeZone = useResolvedTimeZone(timeZone)
  const records = useMemo(() => {
    if (!resolvedTimeZone) {
      return null
    }

    return buildBusiestActivityRecords({
      playedAtIsos,
      timeZone: resolvedTimeZone,
    })
  }, [playedAtIsos, resolvedTimeZone])

  if (playedAtIsos.length === 0) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">No games recorded yet.</p>
  }

  if (!records) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">{localTimeLoadingMessage}</p>
  }

  return (
    <div className="flex min-h-40 flex-col justify-between gap-4">
      {records.day ? (
        <RecordRow label="Day" value={records.day.label} count={records.day.gameCount} />
      ) : null}
      {records.week ? (
        <RecordRow label="Week" value={records.week.label} count={records.week.gameCount} />
      ) : null}
      {records.month ? (
        <RecordRow label="Month" value={records.month.label} count={records.month.gameCount} />
      ) : null}
    </div>
  )
}

BusiestRecordsCard.defaultProps = {
  timeZone: undefined,
}
