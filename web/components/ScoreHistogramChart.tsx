'use client';

import { useState } from 'react';
import { StatsCardDetailSlot } from '@/components/StatsCard';
import { formatPercent } from '@/lib/format';
import type { ScoreHistogramBucket } from '@/lib/stats';

interface Props {
  buckets: ScoreHistogramBucket[];
}

function formatGameCount(count: number) {
  return `${count} game${count === 1 ? '' : 's'}`;
}

function getYAxisTicks(maxCount: number) {
  return [...new Set([0, Math.ceil(maxCount / 2), maxCount])].sort((a, b) => a - b);
}

function fillScoreRange(buckets: ScoreHistogramBucket[]) {
  if (buckets.length === 0) {
    return [];
  }

  const bucketMap = new Map(buckets.map((bucket) => [bucket.score, bucket.count]));
  const minScore = Math.min(...buckets.map((bucket) => bucket.score));
  const maxScore = Math.max(...buckets.map((bucket) => bucket.score));

  return Array.from({ length: maxScore - minScore + 1 }, (_, index) => {
    const score = minScore + index;

    return {
      score,
      count: bucketMap.get(score) ?? 0,
    };
  });
}

function buildChartLayout(buckets: ScoreHistogramBucket[]) {
  const filledBuckets = fillScoreRange(buckets);
  const width = 640;
  const height = 260;
  const plotLeft = 52;
  const plotRight = 24;
  const plotTop = 24;
  const plotBottom = 200;
  const innerWidth = width - plotLeft - plotRight;
  const slotWidth = filledBuckets.length === 0 ? innerWidth : innerWidth / filledBuckets.length;
  const barWidth = Math.max(Math.min(slotWidth * 0.62, 42), 14);
  const maxCount = Math.max(...filledBuckets.map((bucket) => bucket.count), 1);

  return {
    width,
    height,
    plotLeft,
    plotRight,
    plotTop,
    plotBottom,
    barWidth,
    maxCount,
    points: filledBuckets.map((bucket, index) => ({
      ...bucket,
      x: plotLeft + slotWidth * index + slotWidth / 2,
    })),
  };
}

export function ScoreHistogramChart({ buckets }: Props) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  if (buckets.length === 0) {
    return <p className="py-8 text-center text-sm text-(--cream)/50">No scores recorded yet.</p>;
  }

  const totalCount = buckets.reduce((sum, bucket) => sum + bucket.count, 0);
  const { width, height, plotLeft, plotRight, plotTop, plotBottom, barWidth, maxCount, points } =
    buildChartLayout(buckets);
  const activeBucket = activeIndex === null ? null : (points[activeIndex] ?? null);
  const hoverWidth =
    points.length === 1
      ? width - plotLeft - plotRight
      : Math.max(((points[1]?.x ?? points[0].x) - points[0].x) / 1.5, 20);
  const yAxisTicks = getYAxisTicks(maxCount);

  return (
    <div className="space-y-4">
      <StatsCardDetailSlot size="compact" className="text-sm text-(--cream)/55">
        {activeBucket ? (
          <div>
            <p className="text-(--cream)">{activeBucket.score} VP</p>
            <p className="mt-1 tabular-nums">
              {formatGameCount(activeBucket.count)} (
              {formatPercent(activeBucket.count / totalCount, 1)})
            </p>
          </div>
        ) : (
          <p>Hover over a bar to inspect a score bucket.</p>
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
          aria-label="Score histogram"
          onMouseLeave={() => setActiveIndex(null)}
        >
          {yAxisTicks.map((tick) => {
            const y = plotBottom - (tick / maxCount) * (plotBottom - plotTop);

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
          {points.map((bucket) => {
            const barHeight = (bucket.count / maxCount) * (plotBottom - plotTop);
            const y = plotBottom - barHeight;

            return (
              <rect
                key={bucket.score}
                x={bucket.x - barWidth / 2}
                y={y}
                width={barWidth}
                height={barHeight}
                rx="8"
                fill="var(--gold)"
                opacity={activeBucket?.score === bucket.score ? 1 : 0.84}
              />
            );
          })}
          {points.map((bucket) => (
            <g key={`${bucket.score}-x-axis`}>
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
                {bucket.score}
              </text>
            </g>
          ))}
          {points.map((bucket, index) => (
            <rect
              key={`${bucket.score}-target`}
              x={bucket.x - hoverWidth / 2}
              y={plotTop}
              width={hoverWidth}
              height={plotBottom - plotTop}
              fill="transparent"
              role="button"
              tabIndex={0}
              aria-label={`${bucket.score} VP: ${formatGameCount(bucket.count)}, ${formatPercent(bucket.count / totalCount, 1)} of recorded scores`}
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
