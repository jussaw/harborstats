'use client';

import { useState } from 'react';
import { StatsCardDetailSlot } from '@/components/StatsCard';
import { formatAverage } from '@/lib/format';
import { PlayerTier } from '@/lib/player-tier';
import type { PlayerScoreDistribution } from '@/lib/stats';

interface Props {
  distributions: PlayerScoreDistribution[];
}

function formatGameCount(count: number) {
  return `${count} game${count === 1 ? '' : 's'}`;
}

function getYAxisTicks(minScore: number, maxScore: number) {
  return [...new Set([minScore, Math.round((minScore + maxScore) / 2), maxScore])].sort(
    (a, b) => a - b,
  );
}

function buildChartLayout(distributions: PlayerScoreDistribution[]) {
  const width = 720;
  const height = 300;
  const plotLeft = 56;
  const plotRight = 24;
  const plotTop = 24;
  const plotBottom = 210;
  const innerWidth = width - plotLeft - plotRight;
  const slotWidth = distributions.length === 0 ? innerWidth : innerWidth / distributions.length;
  const boxWidth = Math.max(Math.min(slotWidth * 0.42, 40), 18);
  const minScore = Math.min(...distributions.map((distribution) => distribution.min));
  const rawMaxScore = Math.max(...distributions.map((distribution) => distribution.max));
  const maxScore = rawMaxScore === minScore ? rawMaxScore + 1 : rawMaxScore;

  return {
    width,
    height,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    boxWidth,
    minScore,
    maxScore,
    points: distributions.map((distribution, index) => ({
      ...distribution,
      x: plotLeft + slotWidth * index + slotWidth / 2,
    })),
  };
}

function getYPosition(
  value: number,
  minScore: number,
  maxScore: number,
  plotTop: number,
  plotBottom: number,
) {
  return plotBottom - ((value - minScore) / (maxScore - minScore)) * (plotBottom - plotTop);
}

export function PlayerScoreBoxPlot({ distributions }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (distributions.length === 0) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">No scores recorded yet.</p>;
  }

  const {
    width,
    height,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    boxWidth,
    minScore,
    maxScore,
    points,
  } = buildChartLayout(distributions);
  const activeDistribution = activeIndex === null ? null : (points[activeIndex] ?? null);
  const hoverWidth =
    points.length === 1
      ? width - plotLeft - plotRight
      : Math.max(((points[1]?.x ?? points[0].x) - points[0].x) / 1.5, 36);
  const yAxisTicks = getYAxisTicks(minScore, maxScore);

  return (
    <div className="space-y-4">
      <StatsCardDetailSlot size="compact" className="text-sm text-(--cream)/55">
        {activeDistribution ? (
          <div>
            <p
              className={
                activeDistribution.tier === PlayerTier.Premium ? 'text-(--gold)' : `
                  text-(--cream)
                `
              }
            >
              {activeDistribution.name}
            </p>
            <p className="mt-1 tabular-nums">{formatGameCount(activeDistribution.count)}</p>
            <p className="mt-1 tabular-nums">min {formatAverage(activeDistribution.min)}</p>
            <p className="mt-1 tabular-nums">q1 {formatAverage(activeDistribution.q1)}</p>
            <p className="mt-1 tabular-nums">median {formatAverage(activeDistribution.median)}</p>
            <p className="mt-1 tabular-nums">q3 {formatAverage(activeDistribution.q3)}</p>
            <p className="mt-1 tabular-nums">max {formatAverage(activeDistribution.max)}</p>
          </div>
        ) : (
          <p>Hover over a box to inspect a player score spread.</p>
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
          className="h-72 w-full"
          role="img"
          aria-label="Player score distribution"
          onMouseLeave={() => setActiveIndex(null)}
        >
          {yAxisTicks.map((tick) => {
            const y = getYPosition(tick, minScore, maxScore, plotTop, plotBottom);

            return (
              <g key={tick}>
                <line
                  x1={plotLeft}
                  y1={y}
                  x2={width - plotRight}
                  y2={y}
                  stroke="var(--cream)"
                  strokeWidth="1"
                  opacity={tick === minScore ? 0.22 : 0.12}
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
            );
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
          {points.map((distribution) => {
            const yMin = getYPosition(distribution.min, minScore, maxScore, plotTop, plotBottom);
            const yQ1 = getYPosition(distribution.q1, minScore, maxScore, plotTop, plotBottom);
            const yMedian = getYPosition(
              distribution.median,
              minScore,
              maxScore,
              plotTop,
              plotBottom,
            );
            const yQ3 = getYPosition(distribution.q3, minScore, maxScore, plotTop, plotBottom);
            const yMax = getYPosition(distribution.max, minScore, maxScore, plotTop, plotBottom);
            const boxTop = Math.min(yQ1, yQ3);
            const boxHeight = Math.max(Math.abs(yQ1 - yQ3), 4);
            const strokeOpacity = activeDistribution?.playerId === distribution.playerId ? 1 : 0.78;

            return (
              <g key={distribution.playerId}>
                <line
                  x1={distribution.x}
                  y1={yMax}
                  x2={distribution.x}
                  y2={yMin}
                  stroke="var(--cream)"
                  strokeWidth="2"
                  opacity={strokeOpacity}
                />
                <line
                  x1={distribution.x - boxWidth / 3}
                  y1={yMax}
                  x2={distribution.x + boxWidth / 3}
                  y2={yMax}
                  stroke="var(--cream)"
                  strokeWidth="2"
                  opacity={strokeOpacity}
                />
                <line
                  x1={distribution.x - boxWidth / 3}
                  y1={yMin}
                  x2={distribution.x + boxWidth / 3}
                  y2={yMin}
                  stroke="var(--cream)"
                  strokeWidth="2"
                  opacity={strokeOpacity}
                />
                <rect
                  x={distribution.x - boxWidth / 2}
                  y={boxTop}
                  width={boxWidth}
                  height={boxHeight}
                  rx="8"
                  fill="var(--gold)"
                  opacity={activeDistribution?.playerId === distribution.playerId ? 0.95 : 0.8}
                />
                <line
                  x1={distribution.x - boxWidth / 2}
                  y1={yMedian}
                  x2={distribution.x + boxWidth / 2}
                  y2={yMedian}
                  stroke="var(--navy-900)"
                  strokeWidth="2.5"
                />
              </g>
            );
          })}
          {points.map((distribution) => (
            <g key={`${distribution.playerId}-x-axis`}>
              <line
                x1={distribution.x}
                y1={plotBottom}
                x2={distribution.x}
                y2={plotBottom + 6}
                stroke="var(--cream)"
                strokeWidth="1"
                opacity="0.5"
              />
              <text
                x={distribution.x}
                y={height - 14}
                textAnchor={points.length === 1 ? 'middle' : 'end'}
                transform={
                  points.length === 1 ? undefined : `rotate(-30 ${distribution.x} ${height - 14})`
                }
                className={`
                  text-[11px]
                  ${distribution.tier === PlayerTier.Premium ? 'fill-(--gold)' : `
                    fill-(--cream)/55
                  `}
                `}
              >
                {distribution.name}
              </text>
            </g>
          ))}
          {points.map((distribution, index) => (
            <rect
              key={`${distribution.playerId}-target`}
              x={distribution.x - hoverWidth / 2}
              y={plotTop}
              width={hoverWidth}
              height={plotBottom - plotTop}
              fill="transparent"
              role="button"
              tabIndex={0}
              aria-label={`${distribution.name}: ${formatGameCount(distribution.count)}, min ${formatAverage(distribution.min)}, q1 ${formatAverage(distribution.q1)}, median ${formatAverage(distribution.median)}, q3 ${formatAverage(distribution.q3)}, max ${formatAverage(distribution.max)}`}
              onMouseEnter={() => setActiveIndex(index)}
              onFocus={() => setActiveIndex(index)}
              onBlur={() => setActiveIndex((current) => (current === index ? null : current))}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
