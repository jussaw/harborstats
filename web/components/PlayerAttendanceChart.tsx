'use client'

import { useMemo, useState } from 'react'
import { ActivityViewToggle, type ActivityView } from '@/components/ActivityViewToggle'
import {
  buildPlayerAttendanceSeries,
  type PlayerAttendanceBucket,
  type PlayerAttendanceEvent,
} from '@/lib/activity-local-time'
import { localTimeLoadingMessage, useResolvedTimeZone } from '@/lib/use-resolved-time-zone'

interface Props {
  events: PlayerAttendanceEvent[]
  defaultView: ActivityView
  timeZone?: string
}

const PLAYER_COLORS = [
  '#f3c969',
  '#68c3c0',
  '#f28c6f',
  '#85a7ff',
  '#a98ed6',
  '#7ed486',
  '#f0a6ca',
  '#d8d06f',
]

function formatAppearanceCount(count: number) {
  return `${count} appearance${count === 1 ? '' : 's'}`
}

function getYAxisTicks(maxCount: number) {
  return [...new Set([0, Math.ceil(maxCount / 2), maxCount])].sort((a, b) => a - b)
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

function buildAttendanceLayout(data: PlayerAttendanceBucket[]) {
  const width = 640
  const height = 260
  const plotLeft = 52
  const plotRight = 24
  const plotTop = 24
  const plotBottom = 200
  const innerWidth = width - plotLeft - plotRight
  const maxAppearances = Math.max(...data.map((bucket) => bucket.totalAppearances), 1)
  const slotWidth = data.length === 0 ? innerWidth : innerWidth / data.length
  const barWidth = Math.max(Math.min(slotWidth * 0.62, 42), 20)

  return {
    width,
    height,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    maxAppearances,
    barWidth,
    points: data.map((bucket, index) => {
      const x = plotLeft + slotWidth * index + slotWidth / 2

      return {
        ...bucket,
        x,
      }
    }),
  }
}

function getColorForPlayer(playerId: number) {
  return PLAYER_COLORS[playerId % PLAYER_COLORS.length]
}

function getAttendanceDialogPosition({
  bucketX,
  bucketAppearances,
  width,
  height,
  plotTop,
  plotBottom,
  maxAppearances,
}: {
  bucketX: number
  bucketAppearances: number
  width: number
  height: number
  plotTop: number
  plotBottom: number
  maxAppearances: number
}) {
  const dialogWidth = 240
  const dialogGap = 18
  const dialogPadding = 16
  const rightSpace = width - bucketX - dialogPadding
  const leftSpace = bucketX - dialogPadding
  const side = rightSpace >= dialogWidth + dialogGap || rightSpace >= leftSpace ? 'right' : 'left'
  const bucketHeight = (bucketAppearances / maxAppearances) * (plotBottom - plotTop)
  const unclampedAnchorY = plotBottom - bucketHeight + 10
  const minAnchorY = plotTop + 18
  const maxAnchorY = plotTop + (plotBottom - plotTop) * 0.62
  const anchorY = Math.min(maxAnchorY, Math.max(minAnchorY, unclampedAnchorY))

  return {
    side,
    left: `${(bucketX / width) * 100}%`,
    top: `${(anchorY / height) * 100}%`,
    transform:
      side === 'right'
        ? 'translate(18px, -18%)'
        : 'translate(calc(-100% - 18px), -18%)',
  }
}

export function PlayerAttendanceChart({ events, defaultView, timeZone }: Props) {
  const [view, setView] = useState<ActivityView>(defaultView)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const resolvedTimeZone = useResolvedTimeZone(timeZone)
  const series = useMemo(() => {
    if (!resolvedTimeZone) {
      return null
    }

    return buildPlayerAttendanceSeries({
      events,
      timeZone: resolvedTimeZone,
    })
  }, [events, resolvedTimeZone])

  const playerLegend = useMemo(() => {
    const players = new Map<number, { playerId: number; name: string }>()

    events.forEach((event) => {
      if (!players.has(event.playerId)) {
        players.set(event.playerId, { playerId: event.playerId, name: event.name })
      }
    })

    return [...players.values()].sort((a, b) => a.name.localeCompare(b.name))
  }, [events])

  if (events.length === 0) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">No games recorded yet.</p>
  }

  if (!series) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">{localTimeLoadingMessage}</p>
  }

  const data = view === 'week' ? series.weekly : series.monthly
  const { width, height, plotLeft, plotRight, plotTop, plotBottom, maxAppearances, barWidth, points } =
    buildAttendanceLayout(data)
  const activeBucket = activeIndex === null ? null : points[activeIndex] ?? null
  const hoverWidth = points.length === 1
    ? width - plotLeft - plotRight
    : Math.max(((points[1]?.x ?? points[0].x) - points[0].x) / 1.5, 28)
  const yAxisTicks = getYAxisTicks(maxAppearances)
  const xAxisLabelIndices = getXAxisLabelIndices(points.length)
  const dialogPosition = activeBucket
    ? getAttendanceDialogPosition({
        bucketX: activeBucket.x,
        bucketAppearances: activeBucket.totalAppearances,
        width,
        height,
        plotTop,
        plotBottom,
        maxAppearances,
      })
    : null

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-(--cream)/55">
          <p>Hover over a bar to inspect attendance.</p>
        </div>
        <ActivityViewToggle
          view={view}
          onChange={(nextView) => {
            setView(nextView)
            setActiveIndex(null)
          }}
        />
      </div>

      {playerLegend.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {playerLegend.map((player) => (
            <span
              key={player.playerId}
              className="
                inline-flex items-center gap-2 rounded-full border
                border-(--gold)/15 bg-(--navy-900)/45 px-3 py-1 text-xs
                text-(--cream)/75
              "
            >
              <span
                className="size-2.5 rounded-full"
                style={{ backgroundColor: getColorForPlayer(player.playerId) }}
              />
              <span>{player.name}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div
        className="
          relative rounded-2xl border border-(--gold)/15 bg-(--navy-800)/30 p-4
          sm:p-5
        "
      >
        {activeBucket ? (
          <div
            role="dialog"
            aria-label={`Attendance details for ${activeBucket.label}`}
            data-side={dialogPosition?.side}
            className="
              pointer-events-none absolute z-10 min-w-52 rounded-2xl border
              border-(--gold)/20 bg-(--navy-900)/95 p-4
              shadow-[0_18px_40px_rgba(0,0,0,0.28)]
            "
            style={{
              left: dialogPosition?.left,
              top: dialogPosition?.top,
              transform: dialogPosition?.transform,
              maxWidth: 'min(15rem, calc(100% - 2rem))',
            }}
          >
            <p className="text-sm font-semibold text-(--cream)">{activeBucket.label}</p>
            <p className="mt-1 text-sm text-(--gold) tabular-nums">
              {formatAppearanceCount(activeBucket.totalAppearances)}
            </p>
            {activeBucket.segments.length > 0 ? (
              <div className="mt-3 space-y-1 text-sm text-(--cream)/70">
                {activeBucket.segments.map((segment) => (
                  <p key={segment.playerId} className="tabular-nums">
                    {segment.name}: {segment.gameCount}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-(--cream)/55">No appearances in this bucket.</p>
            )}
          </div>
        ) : null}
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-64 w-full"
          role="img"
          aria-label={`Player attendance over time (${view})`}
          onMouseLeave={() => setActiveIndex(null)}
        >
          {yAxisTicks.map((tick) => {
            const y = plotBottom - (tick / maxAppearances) * (plotBottom - plotTop)

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
          {activeBucket ? (
            <line
              x1={activeBucket.x}
              y1={plotTop}
              x2={activeBucket.x}
              y2={plotBottom}
              stroke="var(--cream)"
              strokeWidth="1.5"
              strokeDasharray="4 6"
              opacity="0.55"
            />
          ) : null}
          {points.map((bucket) => {
            let segmentBottom = plotBottom

            return (
              <g key={bucket.bucketStart}>
                {bucket.segments.map((segment) => {
                  const heightRatio = segment.gameCount / maxAppearances
                  const segmentHeight = heightRatio * (plotBottom - plotTop)
                  const y = segmentBottom - segmentHeight

                  segmentBottom = y

                  return (
                    <rect
                      key={segment.playerId}
                      x={bucket.x - barWidth / 2}
                      y={y}
                      width={barWidth}
                      height={segmentHeight}
                      rx="8"
                      fill={getColorForPlayer(segment.playerId)}
                      opacity="0.9"
                    />
                  )
                })}
                <rect
                  x={bucket.x - barWidth / 2}
                  y={plotTop}
                  width={barWidth}
                  height={plotBottom - plotTop}
                  rx="8"
                  fill="none"
                  stroke="var(--cream)"
                  strokeWidth="1"
                  opacity={bucket.totalAppearances === 0 ? 0.16 : 0.08}
                />
              </g>
            )
          })}
          {points.map((bucket, index) => (
            <g key={`${bucket.bucketStart}-x-axis`}>
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
                  className="fill-(--cream)/55 text-[11px]"
                >
                  {bucket.label}
                </text>
              ) : null}
            </g>
          ))}
          {points.map((bucket, index) => (
            <rect
              key={`${bucket.bucketStart}-target`}
              x={bucket.x - hoverWidth / 2}
              y={plotTop}
              width={hoverWidth}
              height={plotBottom - plotTop}
              fill="transparent"
              role="button"
              tabIndex={0}
              aria-label={`${bucket.label}: ${formatAppearanceCount(bucket.totalAppearances)}`}
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

PlayerAttendanceChart.defaultProps = {
  timeZone: undefined,
}
