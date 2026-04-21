'use client'

import { useMemo, useState } from 'react'
import {
  buildDayOfWeekPattern,
  buildTimeOfDayPattern,
  type DistributionBucket,
} from '@/lib/activity-local-time'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'

interface Props {
  playedAtIsos: string[]
  variant: 'weekday' | 'hour'
  timeZone?: string
}

function formatGameCount(count: number) {
  return `${count} game${count === 1 ? '' : 's'}`
}

function getYAxisTicks(maxCount: number) {
  return [...new Set([0, Math.ceil(maxCount / 2), maxCount])].sort((a, b) => a - b)
}

function getXAxisLabelIndices(data: DistributionBucket[], variant: Props['variant']) {
  if (variant === 'weekday') {
    return new Set(Array.from({ length: data.length }, (_, index) => index))
  }

  return new Set([0, 5, 11, 17, data.length - 1])
}

function buildDistributionLayout(data: DistributionBucket[]) {
  const width = 640
  const height = 260
  const plotLeft = 52
  const plotRight = 24
  const plotTop = 24
  const plotBottom = 200
  const innerWidth = width - plotLeft - plotRight
  const slotWidth = data.length === 0 ? innerWidth : innerWidth / data.length
  const barWidth = Math.max(Math.min(slotWidth * 0.62, 42), 14)
  const safeGameCounts = data.map((bucket) => (Number.isFinite(bucket.gameCount) ? bucket.gameCount : 0))
  const maxGameCount = Math.max(...safeGameCounts, 1)

  return {
    width,
    height,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    maxGameCount,
    barWidth,
    points: data.map((bucket, index) => ({
      ...bucket,
      gameCount: Number.isFinite(bucket.gameCount) ? bucket.gameCount : 0,
      x: plotLeft + slotWidth * index + slotWidth / 2,
    })),
  }
}

export function ActivityDistributionChart({ playedAtIsos, variant, timeZone }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const resolvedTimeZone = useResolvedTimeZone(timeZone)
  const data = useMemo(() => {
    if (!resolvedTimeZone) {
      return []
    }

    return variant === 'weekday'
      ? buildDayOfWeekPattern({ playedAtIsos, timeZone: resolvedTimeZone })
      : buildTimeOfDayPattern({ playedAtIsos, timeZone: resolvedTimeZone })
  }, [playedAtIsos, resolvedTimeZone, variant])

  if (playedAtIsos.length === 0) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">No games recorded yet.</p>
  }

  if (!resolvedTimeZone) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">{localTimeLoadingMessage}</p>
  }

  const { width, height, plotLeft, plotRight, plotTop, plotBottom, maxGameCount, barWidth, points } =
    buildDistributionLayout(data)
  const activeBucket = activeIndex === null ? null : points[activeIndex] ?? null
  const hoverWidth = points.length === 1
    ? width - plotLeft - plotRight
    : Math.max(((points[1]?.x ?? points[0].x) - points[0].x) / 1.5, 20)
  const yAxisTicks = getYAxisTicks(maxGameCount)
  const xAxisLabelIndices = getXAxisLabelIndices(data, variant)

  return (
    <div className="space-y-4">
      <div className="text-sm text-(--cream)/55">
        {activeBucket ? (
          <div>
            <p className="text-(--cream)">{activeBucket.label}</p>
            <p className="mt-1 tabular-nums">{formatGameCount(activeBucket.gameCount)}</p>
          </div>
        ) : (
          <p>Hover over a bar to inspect activity.</p>
        )}
      </div>

      <div
        className="
          rounded-2xl border border-(--gold)/15 bg-(--navy-800)/30 p-4
          sm:p-5
        "
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-64 w-full"
          role="img"
          aria-label={variant === 'weekday' ? 'Day-of-week pattern' : 'Time-of-day pattern'}
        >
          {yAxisTicks.map((tick) => {
            const y = plotBottom - (tick / maxGameCount) * (plotBottom - plotTop)

            return (
              <g key={tick}>
                <line
                  x1={plotLeft}
                  y1={y}
                  x2={width - plotRight}
                  y2={y}
                  stroke="var(--cream)"
                  strokeWidth="1"
                  opacity={tick === 0 ? 0.22 : 0.12}
                />
                <text
                  x={plotLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-(--cream)/55 text-[12px]"
                >
                  {tick}
                </text>
              </g>
            )
          })}
          <line
            x1={plotLeft}
            y1={plotBottom}
            x2={width - plotRight}
            y2={plotBottom}
            className="stroke-(--cream)/15"
            strokeWidth="1"
          />
          <line
            x1={plotLeft}
            y1={plotTop}
            x2={plotLeft}
            y2={plotBottom}
            className="stroke-(--cream)/10"
            strokeWidth="1"
          />
          {points.map((bucket) => {
            const barHeight = (bucket.gameCount / maxGameCount) * (plotBottom - plotTop)
            const y = plotBottom - barHeight

            return (
              <rect
                key={bucket.key}
                x={bucket.x - barWidth / 2}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="8"
                fill="var(--gold)"
                opacity={activeBucket?.key === bucket.key ? 1 : 0.84}
              />
            )
          })}
          {points.map((bucket, index) => (
            <g key={`${bucket.key}-x-axis`}>
              <line
                x1={bucket.x}
                y1={plotBottom}
                x2={bucket.x}
                y2={plotBottom + 6}
                stroke="var(--cream)"
                strokeWidth="1"
                opacity="0.5"
              />
              {xAxisLabelIndices.has(index) ? (
                <text
                  x={bucket.x}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-(--cream)/55 text-[10px]"
                >
                  {bucket.label}
                </text>
              ) : null}
            </g>
          ))}
          {points.map((bucket, index) => (
            <rect
              key={`${bucket.key}-target`}
              x={bucket.x - hoverWidth / 2}
              y={plotTop}
              width={hoverWidth}
              height={plotBottom - plotTop}
              fill="transparent"
              role="button"
              tabIndex={0}
              aria-label={`${bucket.label}: ${formatGameCount(bucket.gameCount)}`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex((current) => (current === index ? null : current))}
            />
          ))}
        </svg>
      </div>
    </div>
  )
}
