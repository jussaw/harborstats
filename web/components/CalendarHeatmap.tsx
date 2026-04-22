'use client'

import { useMemo, useState } from 'react'
import {
  buildCalendarHeatmapData,
  type CalendarHeatmapDay,
} from '@/lib/activity-local-time'
import { StatsCardDetailSlot } from '@/components/StatsCard'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'

interface Props {
  playedAtIsos: string[]
  defaultSelection: 'recent' | number
  timeZone?: string
}

type HeatmapSelection = 'recent' | number

function formatGameCount(count: number) {
  return `${count} game${count === 1 ? '' : 's'}`
}

function getIntensity(gameCount: number, maxGameCount: number) {
  if (gameCount === 0 || maxGameCount === 0) {
    return 0
  }

  return Math.max(1, Math.ceil((gameCount / maxGameCount) * 4))
}

function buildWeekColumns(days: CalendarHeatmapDay[]) {
  if (days.length === 0) {
    return []
  }

  const paddedDays: { key: string; day: CalendarHeatmapDay | null }[] = []
  const leadingPadding = new Date(`${days[0].date}T00:00:00.000Z`).getUTCDay()

  for (let index = 0; index < leadingPadding; index += 1) {
    paddedDays.push({ key: `pad-start-${index}`, day: null })
  }

  paddedDays.push(
    ...days.map((day) => ({
      key: day.date,
      day,
    })),
  )

  let trailingPadding = 0
  while (paddedDays.length % 7 !== 0) {
    paddedDays.push({ key: `pad-end-${trailingPadding}`, day: null })
    trailingPadding += 1
  }

  return Array.from({ length: paddedDays.length / 7 }, (_, columnIndex) =>
    paddedDays.slice(columnIndex * 7, columnIndex * 7 + 7),
  )
}

function getCellClasses(intensity: number) {
  switch (intensity) {
    case 4:
      return 'bg-(--gold)'
    case 3:
      return 'bg-[#d6b35f]'
    case 2:
      return 'bg-[#8abfaf]'
    case 1:
      return 'bg-[#406779]'
    default:
      return 'bg-(--navy-900)'
  }
}

export function CalendarHeatmap({
  playedAtIsos,
  defaultSelection,
  timeZone = undefined,
}: Props) {
  const [selection, setSelection] = useState<HeatmapSelection>(defaultSelection)
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null)
  const resolvedTimeZone = useResolvedTimeZone(timeZone)
  const data = useMemo(() => {
    if (!resolvedTimeZone) {
      return null
    }

    return buildCalendarHeatmapData({
      playedAtIsos,
      timeZone: resolvedTimeZone,
    })
  }, [playedAtIsos, resolvedTimeZone])

  if (playedAtIsos.length === 0) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">No games recorded yet.</p>
  }

  if (!data) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">{localTimeLoadingMessage}</p>
  }

  const options = [
    { id: 'recent' as const, label: 'Last 12 Months' },
    ...data.years.map((year) => ({ id: year.year, label: String(year.year) })),
  ]

  const selectedYear =
    typeof selection === 'number' ? data.years.find((year) => year.year === selection) ?? null : null
  const days = selection === 'recent' ? data.recentDays : (selectedYear?.days ?? [])
  let summaryLabel = data.recentRangeLabel
  if (selection !== 'recent') {
    summaryLabel = selectedYear ? `${selectedYear.year} · ${selectedYear.totalGames} total games` : null
  }
  const maxGameCount = Math.max(...days.map((day) => day.gameCount), 0)
  const weekColumns = buildWeekColumns(days)
  const activeDay = activeDateKey
    ? days.find((day) => day.date === activeDateKey) ?? null
    : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StatsCardDetailSlot
          size="roomy"
          className="flex-1 text-sm text-(--cream)/55"
        >
          {summaryLabel ? <p>{summaryLabel}</p> : null}
          {activeDay ? (
            <div className="mt-2">
              <p className="text-(--cream)">{activeDay.label}</p>
              <p className="mt-1 tabular-nums">{formatGameCount(activeDay.gameCount)}</p>
            </div>
          ) : (
            <p className="mt-2">Hover over a day to inspect activity.</p>
          )}
        </StatsCardDetailSlot>
        <div className="flex flex-wrap gap-2">
          {options.map((option) => (
            <button
              key={String(option.id)}
              type="button"
              aria-pressed={selection === option.id}
              className={`
                rounded-full border px-3 py-1 text-xs font-semibold
                tracking-[0.2em] uppercase transition-colors
                ${
                  selection === option.id
                    ? 'border-(--gold) bg-(--gold) text-(--navy-900)'
                    : `
                      border-(--gold)/15 bg-(--navy-900)/45 text-(--cream)/65
                      hover:text-(--cream)
                    `
                }
              `}
              onClick={() => {
                setSelection(option.id)
                setActiveDateKey(null)
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div
        className="
          overflow-x-auto rounded-2xl border border-(--gold)/15
          bg-(--navy-800)/30 p-4
          sm:p-5
        "
      >
        <div
          className="
            mb-3 flex min-w-max items-center gap-3 text-[11px] tracking-[0.24em]
            text-(--cream)/45 uppercase
          "
        >
          <span>Sun</span>
          <span>Tue</span>
          <span>Thu</span>
          <span>Sat</span>
        </div>
        <div
          className="grid min-w-max grid-flow-col grid-rows-7 gap-1"
          role="grid"
          aria-label="Calendar heatmap"
          tabIndex={-1}
          onMouseLeave={() => setActiveDateKey(null)}
        >
          {weekColumns.map((column) =>
            column.map((cell) => {
              if (!cell.day) {
                return <div key={cell.key} className="size-3" />
              }

              const { day } = cell
              const intensity = getIntensity(day.gameCount, maxGameCount)

              return (
                <button
                  key={cell.key}
                  type="button"
                  aria-label={`${day.label}: ${formatGameCount(day.gameCount)}`}
                  data-intensity={String(intensity)}
                  className={`
                    size-3 rounded-[3px]
                    ${getCellClasses(intensity)}
                  `}
                  onMouseEnter={() => setActiveDateKey(day.date)}
                  onFocus={() => setActiveDateKey(day.date)}
                  onBlur={() => setActiveDateKey((current) => (current === day.date ? null : current))}
                />
              )
            }),
          )}
        </div>
      </div>
    </div>
  )
}

CalendarHeatmap.defaultProps = {
  timeZone: undefined,
}
