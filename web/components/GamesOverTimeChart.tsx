'use client'

import { useMemo, useState } from 'react'
import { buildGamesOverTimeSeries, type ActivityBucket } from '@/lib/activity-local-time'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'
import { ActivityViewToggle, type ActivityView } from '@/components/ActivityViewToggle'
import { StatsCardDetailSlot } from '@/components/StatsCard'

interface Props {
  playedAtIsos: string[]
  defaultView: ActivityView
  timeZone?: string
}

function buildPolylinePoints(data: ActivityBucket[]) {
  const width = 640
  const height = 240
  const plotLeft = 52
  const plotRight = 24
  const plotTop = 24
  const plotBottom = 190
  const innerWidth = width - plotLeft - plotRight
  const innerHeight = plotBottom - plotTop
  const maxGameCount = Math.max(...data.map((bucket) => bucket.gameCount), 1)

  return {
    width,
    height,
    maxGameCount,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    points: data.map((bucket, index) => {
      const x = data.length === 1
        ? width / 2
        : plotLeft + (innerWidth * index) / (data.length - 1)
      const y = plotTop + innerHeight - (bucket.gameCount / maxGameCount) * innerHeight

      return {
        ...bucket,
        x,
        y,
      }
    }),
  }
}

function getYAxisTicks(maxGameCount: number) {
  return [...new Set([0, Math.ceil(maxGameCount / 2), maxGameCount])].sort((a, b) => a - b)
}

function getXAxisLabelIndices(pointCount: number) {
  if (pointCount <= 6) {
    return new Set(Array.from({ length: pointCount }, (_, index) => index))
  }

  return new Set([
    0,
    Math.floor((pointCount - 1) / 3),
    Math.floor(((pointCount - 1) * 2) / 3),
    pointCount - 1,
  ])
}

export function GamesOverTimeChart({
  playedAtIsos,
  defaultView,
  timeZone = undefined,
}: Props) {
  const [view, setView] = useState<ActivityView>(defaultView)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const resolvedTimeZone = useResolvedTimeZone(timeZone)
  const series = useMemo(() => {
    if (!resolvedTimeZone) {
      return null
    }

    return buildGamesOverTimeSeries({
      playedAtIsos,
      timeZone: resolvedTimeZone,
    })
  }, [playedAtIsos, resolvedTimeZone])

  if (playedAtIsos.length === 0) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">No games recorded yet.</p>
  }

  if (!series) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">{localTimeLoadingMessage}</p>
  }

  const data = view === 'week' ? series.weekly : series.monthly
  const {
    width,
    height,
    maxGameCount,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    points,
  } = buildPolylinePoints(data)
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(' ')
  const activePoint = activeIndex === null ? null : points[activeIndex] ?? null
  const hoverWidth = points.length === 1
    ? width - plotLeft - plotRight
    : Math.max((points[1].x - points[0].x) / 1.5, 28)
  const yAxisTicks = getYAxisTicks(maxGameCount)
  const xAxisLabelIndices = getXAxisLabelIndices(points.length)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <StatsCardDetailSlot
          size="compact"
          className="flex-1 text-sm text-(--cream)/55"
        >
          {activePoint ? (
            <div>
              <p className="text-(--cream)">{activePoint.label}</p>
              <p className="mt-1 tabular-nums">
                {activePoint.gameCount} game{activePoint.gameCount === 1 ? '' : 's'}
              </p>
            </div>
          ) : (
            <p>Hover over a data point to inspect its bucket.</p>
          )}
        </StatsCardDetailSlot>
        <ActivityViewToggle
          view={view}
          onChange={(nextView) => {
            setView(nextView)
            setActiveIndex(null)
          }}
        />
      </div>

      <div
        className="
          rounded-2xl border border-(--gold)/15 bg-(--navy-800)/30 p-4
          sm:p-5
        "
      >
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-56 w-full"
          role="img"
          aria-label={`Games over time (${view})`}
          onMouseLeave={() => setActiveIndex(null)}
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
          {activePoint ? (
            <line
              x1={activePoint.x}
              y1={plotTop}
              x2={activePoint.x}
              y2={plotBottom}
              stroke="var(--cream)"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              opacity="0.55"
            />
          ) : null}
          <polyline
            fill="none"
            stroke="var(--gold)"
            strokeWidth="4"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={linePoints}
          />
          {points.map((point) => (
            <circle
              key={point.bucketStart}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="var(--navy-900)"
              stroke="var(--gold)"
              strokeWidth="3"
            />
          ))}
          {points.map((point, index) => (
            <g key={`${point.bucketStart}-x-axis`}>
              <line
                x1={point.x}
                y1={plotBottom}
                x2={point.x}
                y2={plotBottom + 6}
                stroke="var(--cream)"
                strokeWidth="1"
                opacity="0.5"
              />
              {xAxisLabelIndices.has(index) ? (
                <text
                  x={point.x}
                  y={height - 10}
                  textAnchor="middle"
                  className="fill-(--cream)/55 text-[11px]"
                >
                  {point.label}
                </text>
              ) : null}
            </g>
          ))}
          {points.map((point, index) => (
            <g key={`${point.bucketStart}-target`}>
              <rect
                x={point.x - hoverWidth / 2}
                y={plotTop}
                width={hoverWidth}
                height={plotBottom - plotTop}
                fill="transparent"
                role="button"
                tabIndex={0}
                aria-label={`${point.label}: ${point.gameCount} game${point.gameCount === 1 ? '' : 's'}`}
                onMouseEnter={() => setActiveIndex(index)}
                onFocus={() => setActiveIndex(index)}
                onBlur={() => setActiveIndex((current) => (current === index ? null : current))}
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  )
}

GamesOverTimeChart.defaultProps = {
  timeZone: undefined,
}
