'use client';

import { useMemo, useState } from 'react';
import type { PlayerRating } from '@/lib/rating';
import { StatsCardDetailSlot } from '@/components/StatsCard';

interface Props {
  players: PlayerRating[];
}

function shortDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

function signed(value: number) {
  return `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}`;
}

function seriesStyle(index: number) {
  const colors = ['var(--gold)', 'var(--cream)', 'var(--gold-300)'];
  const unit = index + 2;
  return {
    color: colors[index % colors.length],
    dash: index === 0 ? undefined : `${unit * 3} ${unit} ${unit} ${unit}`,
  };
}

export function RatingHistoryChart({ players }: Props) {
  const [active, setActive] = useState<{ player: PlayerRating; pointIndex: number } | null>(null);
  const series = useMemo(() => players.filter((player) => player.history.length > 0), [players]);

  if (series.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-(--cream)/50">No rated multiplayer games yet.</p>
    );
  }

  const points = series.flatMap((player) => player.history);
  const width = 640;
  const height = 250;
  const left = 52;
  const right = 20;
  const top = 20;
  const bottom = 200;
  const min = Math.min(...points.map((point) => point.rating), 1500);
  const max = Math.max(...points.map((point) => point.rating), 1500);
  const padding = Math.max(8, (max - min) * 0.15);
  const domainMin = min - padding;
  const domainMax = max + padding;
  const maxSequence = Math.max(...points.map((point) => point.sequence), 0);
  const x = (sequence: number) =>
    maxSequence === 0 ? width / 2 : left + ((width - left - right) * sequence) / maxSequence;
  const y = (rating: number) =>
    top + ((domainMax - rating) / (domainMax - domainMin)) * (bottom - top);
  const activePoint = active ? active.player.history[active.pointIndex] : null;

  return (
    <div className="space-y-4">
      <StatsCardDetailSlot size="compact" className="text-sm text-(--cream)/55">
        {activePoint && active ? (
          <div>
            <p className="text-(--cream)">
              {active.player.name} · {shortDate(activePoint.playedAt)}
            </p>
            <p className="mt-1 text-(--gold) tabular-nums">
              {Math.round(activePoint.rating)} Elo ·{' '}
              {activePoint.participated ? signed(activePoint.change) : 'Did not play'}
            </p>
          </div>
        ) : (
          <p>Hover or focus a data point to inspect a rating.</p>
        )}
      </StatsCardDetailSlot>
      <div className="rounded-2xl border border-(--gold)/15 bg-(--navy-800)/30 p-4 sm:p-5">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-56 w-full"
          role="group"
          aria-label="Multiplayer Elo rating history"
          onMouseLeave={() => setActive(null)}
        >
          {[domainMin, (domainMin + domainMax) / 2, domainMax].map((tick) => (
            <g key={tick}>
              <line
                x1={left}
                x2={width - right}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--cream)"
                opacity="0.12"
              />
              <text
                x={left - 8}
                y={y(tick) + 4}
                textAnchor="end"
                className="fill-(--cream)/55 text-[11px]"
              >
                {Math.round(tick)}
              </text>
            </g>
          ))}
          {series.map((player, playerIndex) => {
            const style = seriesStyle(playerIndex);
            return (
              <g key={player.playerId}>
                <polyline
                  fill="none"
                  stroke={style.color}
                  strokeWidth="3"
                  strokeDasharray={style.dash}
                  points={player.history
                    .map((point) => `${x(point.sequence)},${y(point.rating)}`)
                    .join(' ')}
                />
                {player.history.map((point, pointIndex) => (
                  <circle
                    key={point.gameId}
                    cx={x(point.sequence)}
                    cy={y(point.rating)}
                    r="5"
                    fill="var(--navy-900)"
                    stroke={style.color}
                    strokeWidth="2"
                    role="button"
                    tabIndex={0}
                    aria-label={`${player.name}, ${shortDate(point.playedAt)}, ${Math.round(point.rating)} Elo, ${point.participated ? signed(point.change) : 'did not play'}`}
                    onMouseEnter={() => setActive({ player, pointIndex })}
                    onFocus={() => setActive({ player, pointIndex })}
                    onBlur={() => setActive(null)}
                    onClick={() => setActive({ player, pointIndex })}
                  />
                ))}
              </g>
            );
          })}
        </svg>
      </div>
      <ul
        className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-(--cream)/70"
        aria-label="Rating history legend"
      >
        {series.map((player, index) => {
          const style = seriesStyle(index);
          return (
            <li key={player.playerId}>
              <svg
                aria-hidden="true"
                viewBox="0 0 20 4"
                className="mr-2 inline-block h-2 w-5 align-middle"
              >
                <line
                  x1="0"
                  x2="20"
                  y1="2"
                  y2="2"
                  stroke={style.color}
                  strokeWidth="2"
                  strokeDasharray={style.dash}
                />
              </svg>
              {player.name}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
