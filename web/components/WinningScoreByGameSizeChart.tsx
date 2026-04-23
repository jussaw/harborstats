'use client'

import { useState } from 'react'
import { StatsCardDetailSlot } from '@/components/StatsCard'
import { formatAverage } from '@/lib/format'
import type { WinningScoreByGameSizeBucket } from '@/lib/stats'

interface Props {
  buckets: WinningScoreByGameSizeBucket[]
}

function formatGameCount(count: number) {
  return `${count} game${count === 1 ? '' : 's'}`
}

function formatBucketLabel(playerCount: number) {
  return `${playerCount}P`
}

function getYAxisTicks(maxScore: number) {
  return [...new Set([0, Math.ceil(maxScore / 2), Math.ceil(maxScore)])].sort((a, b) => a - b)
}

function buildChartLayout(buckets: WinningScoreByGameSizeBucket[]) {
  const width = 640
  const height = 260
  const plotLeft = 52
  const plotRight = 24
  const plotTop = 24
  const plotBottom = 200
  const innerWidth = width - plotLeft - plotRight
  const slotWidth = buckets.length === 0 ? innerWidth : innerWidth / buckets.length
  const barWidth = Math.max(Math.min(slotWidth * 0.62, 64), 18)
  const maxScore = Math.max(...buckets.map((bucket) => bucket.avgWinningScore), 1)

  return {
    width,
    height,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    maxScore,
    barWidth,
    points: buckets.map((bucket, index) => ({
      ...bucket,
      label: formatBucketLabel(bucket.playerCount),
      x: plotLeft + slotWidth * index + slotWidth / 2,
    })),
  }
}

export function WinningScoreByGameSizeChart({ buckets }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  if (buckets.length === 0) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">No games recorded yet.</p>
  }

  const { width, height, plotLeft, plotRight, plotTop, plotBottom, maxScore, barWidth, points } =
    buildChartLayout(buckets)
  const activeBucket = activeIndex === null ? null : points[activeIndex] ?? null
  const hoverWidth = points.length === 1
    ? width - plotLeft - plotRight
    : Math.max(((points[1]?.x ?? points[0].x) - points[0].x) / 1.5, 28)
  const yAxisTicks = getYAxisTicks(maxScore)

  return (
    <div className="space-y-4">
      <StatsCardDetailSlot
        size="compact"
        className="text-sm text-(--cream)/55"
      >
        {activeBucket ? (
          <div>
            <p className="text-(--cream)">{activeBucket.label}</p>
            <p className="mt-1 tabular-nums">
              {formatAverage(activeBucket.avgWinningScore)} avg winning score
            </p>
            <p className="mt-1 tabular-nums">{formatGameCount(activeBucket.gameCount)}</p>
          </div>
        ) : (
          <p>Hover over a bar to inspect a game-size bucket.</p>
        )}
      </StatsCardDetailSlot>

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
          aria-label="Winning score by game size"
          onMouseLeave={() => setActiveIndex(null)}
        >
          {yAxisTicks.map((tick) => {
            const y = plotBottom - (tick / maxScore) * (plotBottom - plotTop)

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
            const barHeight = (bucket.avgWinningScore / maxScore) * (plotBottom - plotTop)
            const y = plotBottom - barHeight

            return (
              <rect
                key={bucket.playerCount}
                x={bucket.x - barWidth / 2}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="8"
                fill="var(--gold)"
                opacity={activeBucket?.playerCount === bucket.playerCount ? 1 : 0.84}
              />
            )
          })}
          {points.map((bucket) => (
            <g key={`${bucket.playerCount}-x-axis`}>
              <line
                x1={bucket.x}
                y1={plotBottom}
                x2={bucket.x}
                y2={plotBottom + 6}
                stroke="var(--cream)"
                strokeWidth="1"
                opacity="0.5"
              />
              <text
                x={bucket.x}
                y={height - 10}
                textAnchor="middle"
                className="fill-(--cream)/55 text-[11px]"
              >
                {bucket.label}
              </text>
            </g>
          ))}
          {points.map((bucket, index) => (
            <rect
              key={`${bucket.playerCount}-target`}
              x={bucket.x - hoverWidth / 2}
              y={plotTop}
              width={hoverWidth}
              height={plotBottom - plotTop}
              fill="transparent"
              role="button"
              tabIndex={0}
              aria-label={`${bucket.label}: ${formatAverage(bucket.avgWinningScore)} average winning score across ${formatGameCount(bucket.gameCount)}`}
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
