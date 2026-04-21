'use client'

import { useMemo, useState } from 'react'
import type { CalendarHeatmapDay, CalendarHeatmapYear } from '@/lib/stats'

interface Props {
  recentDays: CalendarHeatmapDay[]
  recentRangeLabel: string | null
  years: CalendarHeatmapYear[]
  defaultSelection: 'recent' | number
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
  const leadingPadding = days[0].date.getUTCDay()

  for (let index = 0; index < leadingPadding; index += 1) {
    paddedDays.push({ key: `pad-start-${index}`, day: null })
  }

  paddedDays.push(
    ...days.map((day) => ({
      key: day.date.toISOString(),
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
  recentDays,
  recentRangeLabel,
  years,
  defaultSelection,
}: Props) {
  const [selection, setSelection] = useState<HeatmapSelection>(defaultSelection)
  const [activeDateKey, setActiveDateKey] = useState<string | null>(null)

  const options = useMemo(
    () => [
      { id: 'recent' as const, label: 'Last 12 Months' },
      ...years.map((year) => ({ id: year.year, label: String(year.year) })),
    ],
    [years],
  )

  const selectedYear =
    typeof selection === 'number' ? years.find((year) => year.year === selection) ?? null : null
  const days = selection === 'recent' ? recentDays : (selectedYear?.days ?? [])
  let summaryLabel = recentRangeLabel
  if (selection !== 'recent') {
    summaryLabel = selectedYear ? `${selectedYear.year} · ${selectedYear.totalGames} total games` : null
  }
  const maxGameCount = Math.max(...days.map((day) => day.gameCount), 0)
  const weekColumns = buildWeekColumns(days)
  const activeDay = activeDateKey
    ? days.find((day) => day.date.toISOString() === activeDateKey) ?? null
    : null

  if (recentDays.length === 0 && years.length === 0) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">No games recorded yet.</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-(--cream)/55">
          {summaryLabel ? <p>{summaryLabel}</p> : null}
          {activeDay ? (
            <div className="mt-2">
              <p className="text-(--cream)">{activeDay.label}</p>
              <p className="mt-1 tabular-nums">{formatGameCount(activeDay.gameCount)}</p>
            </div>
          ) : (
            <p className="mt-2">Hover over a day to inspect activity.</p>
          )}
        </div>
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
            mb-3 flex min-w-max items-center gap-3 text-[11px] uppercase
            tracking-[0.24em] text-(--cream)/45
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
                  onMouseEnter={() => setActiveDateKey(day.date.toISOString())}
                  onFocus={() => setActiveDateKey(day.date.toISOString())}
                  onBlur={() => setActiveDateKey((current) =>
                    current === day.date.toISOString() ? null : current
                  )}
                />
              )
            }),
          )}
        </div>
      </div>
    </div>
  )
}
