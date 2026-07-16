'use client';

import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { getChartDialogPosition } from '@/lib/chart-dialog-position';
import { buildPlayerColorMap } from '@/lib/player-colors';
import { PROVISIONAL_GAMES, type PlayerRating, type RatingHistoryPoint } from '@/lib/rating';
import {
  buildSequenceAxis,
  buildTooltipRows,
  getXAxisLabelSequences,
  highlightForY,
  nearestSequenceForX,
  splitProvisionalSegments,
} from '@/lib/rating-history-view';

const WIDTH = 480;
const HEIGHT = 280;
const PLOT_LEFT = 46;
const PLOT_RIGHT = 14;
const PLOT_TOP = 16;
const PLOT_BOTTOM = 242;
const X_LABEL_BASELINE = 268;
const PLOT_WIDTH = WIDTH - PLOT_LEFT - PLOT_RIGHT;
const BASELINE_RATING = 1500;
const HIGHLIGHT_THRESHOLD_PX = 20;
const FADED_OPACITY = 0.25;

const FALLBACK_COLOR = 'var(--player-color-1)';

function shortDate(iso: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(iso));
}

interface ViewBoxPoint {
  x: number;
  y: number;
  scale: number;
}

/**
 * Converts a client (screen) coordinate to viewBox units. Prefers the SVG CTM
 * so letterboxing from preserveAspectRatio is handled exactly; falls back to a
 * bounding-rect ratio, and bails when neither is available (e.g. jsdom).
 */
function clientToViewBox(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number,
): ViewBoxPoint | null {
  const ctm = svg.getScreenCTM?.();
  if (ctm && typeof DOMPoint !== 'undefined') {
    const local = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    return { x: local.x, y: local.y, scale: ctm.a || 1 };
  }
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;
  return {
    x: ((clientX - rect.left) / rect.width) * WIDTH,
    y: ((clientY - rect.top) / rect.height) * HEIGHT,
    scale: rect.width / WIDTH,
  };
}

function pointAtSequence(player: PlayerRating, sequence: number): RatingHistoryPoint | undefined {
  return player.history.find((entry) => entry.sequence === sequence);
}

function xAxisAnchor(
  sequence: number,
  firstSequence: number,
  lastSequence: number,
): 'start' | 'middle' | 'end' {
  if (sequence === firstSequence) return 'start';
  if (sequence === lastSequence) return 'end';
  return 'middle';
}

interface Props {
  players: PlayerRating[];
  rosterPlayerIds: number[];
}

export function RatingHistoryChart({ players, rosterPlayerIds }: Props) {
  const hintId = useId();
  const [crosshairSequence, setCrosshairSequence] = useState<number | null>(null);
  const [pointerHighlightId, setPointerHighlightId] = useState<number | null>(null);
  const [legendHighlightId, setLegendHighlightId] = useState<number | null>(null);
  const [hiddenPlayerIds, setHiddenPlayerIds] = useState<ReadonlySet<number>>(new Set());
  const svgRef = useRef<SVGSVGElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const series = useMemo(() => players.filter((player) => player.history.length > 0), [players]);
  const colorByPlayerId = useMemo(() => buildPlayerColorMap(rosterPlayerIds), [rosterPlayerIds]);

  useEffect(() => {
    if (crosshairSequence === null) return undefined;
    function handlePointerDownOutside(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setCrosshairSequence(null);
        setPointerHighlightId(null);
      }
    }
    document.addEventListener('pointerdown', handlePointerDownOutside);
    return () => document.removeEventListener('pointerdown', handlePointerDownOutside);
  }, [crosshairSequence]);

  if (series.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-(--cream)/50">No rated multiplayer games yet.</p>
    );
  }

  const showLegend = series.length > 1;
  const visibleSeries = series.filter((player) => !hiddenPlayerIds.has(player.playerId));
  const axis = buildSequenceAxis(series);
  const maxSequence = axis.length > 0 ? axis[axis.length - 1].sequence : 0;

  const ratings = series.flatMap((player) => player.history.map((point) => point.rating));
  const min = Math.min(...ratings, BASELINE_RATING);
  const max = Math.max(...ratings, BASELINE_RATING);
  const padding = Math.max(8, (max - min) * 0.15);
  const domainMin = min - padding;
  const domainMax = max + padding;

  const x = (sequence: number) =>
    maxSequence === 0 ? PLOT_LEFT + PLOT_WIDTH / 2 : PLOT_LEFT + (PLOT_WIDTH * sequence) / maxSequence;
  const y = (rating: number) =>
    PLOT_TOP + ((domainMax - rating) / (domainMax - domainMin)) * (PLOT_BOTTOM - PLOT_TOP);

  const colorFor = (playerId: number) => colorByPlayerId.get(playerId) ?? FALLBACK_COLOR;
  const highlight = legendHighlightId ?? pointerHighlightId;
  const firstSequence = axis.length > 0 ? axis[0].sequence : 0;
  const xLabelSequences = getXAxisLabelSequences(axis);

  const tooltipRows =
    crosshairSequence === null ? [] : buildTooltipRows(series, hiddenPlayerIds, crosshairSequence);
  const crosshairEntry =
    crosshairSequence === null ? null : axis.find((entry) => entry.sequence === crosshairSequence);
  const liveSummary =
    crosshairEntry && tooltipRows.length > 0
      ? `${shortDate(crosshairEntry.playedAt)} — ${tooltipRows
          .map((row) => `${row.name} ${Math.round(row.rating)}`)
          .join(', ')}`
      : '';
  const dialogPosition =
    crosshairSequence === null
      ? null
      : getChartDialogPosition({
          anchorX: x(crosshairSequence),
          anchorY: PLOT_TOP + (PLOT_BOTTOM - PLOT_TOP) * 0.3,
          width: WIDTH,
          height: HEIGHT,
        });

  const updateFromPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const local = clientToViewBox(svg, event.clientX, event.clientY);
    if (!local) return;
    const sequence = nearestSequenceForX(local.x, {
      left: PLOT_LEFT,
      plotWidth: PLOT_WIDTH,
      maxSequence,
    });
    setCrosshairSequence(sequence);
    const candidates = visibleSeries
      .map((player) => {
        const point = pointAtSequence(player, sequence);
        return point ? { playerId: player.playerId, yView: y(point.rating) } : null;
      })
      .filter((candidate): candidate is { playerId: number; yView: number } => candidate !== null);
    setPointerHighlightId(highlightForY(candidates, local.y, HIGHLIGHT_THRESHOLD_PX / local.scale));
  };

  const handleKeyDown = (event: ReactKeyboardEvent<SVGSVGElement>) => {
    let next: number | null = crosshairSequence;
    switch (event.key) {
      case 'ArrowRight':
        next = crosshairSequence === null ? 0 : Math.min(crosshairSequence + 1, maxSequence);
        break;
      case 'ArrowLeft':
        next = crosshairSequence === null ? maxSequence : Math.max(crosshairSequence - 1, 0);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = maxSequence;
        break;
      case 'Escape':
        event.preventDefault();
        setCrosshairSequence(null);
        setPointerHighlightId(null);
        return;
      default:
        return;
    }
    event.preventDefault();
    setCrosshairSequence(next);
    setPointerHighlightId(null);
  };

  return (
    <div ref={rootRef} className="space-y-4">
      <div
        className="
          relative rounded-2xl border border-(--gold)/15 bg-(--navy-800)/30 p-4
          sm:p-5
        "
      >
        {dialogPosition ? (
          <div
            aria-hidden="true"
            data-side={dialogPosition.side}
            className="
              pointer-events-none absolute z-10 min-w-48 rounded-2xl border
              border-(--gold)/20 bg-(--navy-900)/95 p-4
              shadow-[0_18px_40px_rgba(0,0,0,0.28)]
            "
            style={{
              left: dialogPosition.left,
              top: dialogPosition.top,
              transform: dialogPosition.transform,
              maxWidth: 'min(15rem, calc(100% - 2rem))',
            }}
          >
            {crosshairEntry ? (
              <p className="text-sm font-semibold text-(--cream)">
                {shortDate(crosshairEntry.playedAt)}
              </p>
            ) : null}
            {tooltipRows.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {tooltipRows.map((row) => (
                  <li
                    key={row.playerId}
                    className={`
                      flex items-center gap-2 text-sm tabular-nums
                      ${highlight === row.playerId ? `
                        font-semibold text-(--cream)
                      ` : `text-(--cream)/70`}
                    `}
                  >
                    <span
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: colorFor(row.playerId) }}
                    />
                    <span className="min-w-0 flex-1 truncate">{row.name}</span>
                    <span>{Math.round(row.rating)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-sm text-(--cream)/55">No ratings at this game.</p>
            )}
          </div>
        ) : null}
        <svg
          ref={svgRef}
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          className="
            h-72 w-full touch-pan-y rounded-lg outline-none
            focus-visible:ring-2 focus-visible:ring-(--gold)/40
          "
          role="group"
          tabIndex={0}
          aria-label="Multiplayer Elo rating history"
          aria-describedby={hintId}
          onPointerMove={updateFromPointer}
          onPointerDown={(event) => {
            updateFromPointer(event);
            if (event.pointerType === 'touch') {
              svgRef.current?.setPointerCapture?.(event.pointerId);
            }
          }}
          onPointerLeave={(event) => {
            if (event.pointerType === 'mouse') {
              setCrosshairSequence(null);
              setPointerHighlightId(null);
            }
          }}
          onKeyDown={handleKeyDown}
        >
          {[domainMin, (domainMin + domainMax) / 2, domainMax].map((tick) => (
            <g key={tick} className="pointer-events-none">
              <line
                x1={PLOT_LEFT}
                x2={WIDTH - PLOT_RIGHT}
                y1={y(tick)}
                y2={y(tick)}
                stroke="var(--cream)"
                opacity="0.12"
              />
              <text
                x={PLOT_LEFT - 8}
                y={y(tick) + 4}
                textAnchor="end"
                className="fill-(--cream)/55 text-[11px]"
              >
                {Math.round(tick)}
              </text>
            </g>
          ))}
          {domainMin <= BASELINE_RATING && BASELINE_RATING <= domainMax ? (
            <line
              data-testid="rating-baseline"
              x1={PLOT_LEFT}
              x2={WIDTH - PLOT_RIGHT}
              y1={y(BASELINE_RATING)}
              y2={y(BASELINE_RATING)}
              stroke="var(--cream)"
              strokeWidth="1"
              strokeDasharray="6 6"
              opacity="0.25"
              className="pointer-events-none"
            />
          ) : null}
          {xLabelSequences.map((sequence) => {
            const entry = axis.find((candidate) => candidate.sequence === sequence);
            if (!entry) return null;
            return (
              <text
                key={sequence}
                x={x(sequence)}
                y={X_LABEL_BASELINE}
                textAnchor={xAxisAnchor(sequence, firstSequence, maxSequence)}
                className="pointer-events-none fill-(--cream)/55 text-[11px]"
              >
                {shortDate(entry.playedAt)}
              </text>
            );
          })}
          {visibleSeries.map((player) => {
            const color = colorFor(player.playerId);
            const opacity = highlight === null || highlight === player.playerId ? 1 : FADED_OPACITY;
            const { provisional, established } = splitProvisionalSegments(
              player.history,
              PROVISIONAL_GAMES,
            );
            const toPoints = (segment: RatingHistoryPoint[]) =>
              segment.map((point) => `${x(point.sequence)},${y(point.rating)}`).join(' ');
            return (
              <g
                key={player.playerId}
                className="pointer-events-none transition-opacity duration-150"
                style={{ opacity }}
              >
                {provisional.length >= 2 ? (
                  <polyline
                    fill="none"
                    stroke={color}
                    strokeWidth="2.5"
                    strokeDasharray="5 5"
                    points={toPoints(provisional)}
                  />
                ) : null}
                {established.length >= 2 ? (
                  <polyline fill="none" stroke={color} strokeWidth="2.5" points={toPoints(established)} />
                ) : null}
                {player.history.length === 1 ? (
                  <circle
                    cx={x(player.history[0].sequence)}
                    cy={y(player.history[0].rating)}
                    r="3"
                    fill={color}
                  />
                ) : null}
              </g>
            );
          })}
          {crosshairSequence !== null ? (
            <g className="pointer-events-none">
              <line
                data-testid="rating-crosshair"
                x1={x(crosshairSequence)}
                x2={x(crosshairSequence)}
                y1={PLOT_TOP}
                y2={PLOT_BOTTOM}
                stroke="var(--cream)"
                strokeWidth="1.5"
                strokeDasharray="4 6"
                opacity="0.55"
              />
              {visibleSeries.map((player) => {
                const point = pointAtSequence(player, crosshairSequence);
                if (!point) return null;
                return (
                  <circle
                    key={player.playerId}
                    cx={x(crosshairSequence)}
                    cy={y(point.rating)}
                    r={highlight === player.playerId ? 4.5 : 3.5}
                    fill={colorFor(player.playerId)}
                  />
                );
              })}
            </g>
          ) : null}
        </svg>
      </div>
      <p id={hintId} className="sr-only">
        Use the arrow keys to move between games, Home and End to jump to the first and last game,
        and Escape to clear.
      </p>
      <p aria-live="polite" className="sr-only">
        {liveSummary}
      </p>
      {showLegend ? (
        <ul
          className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-(--cream)/70"
          aria-label="Rating history legend"
        >
          {series.map((player) => {
            const hidden = hiddenPlayerIds.has(player.playerId);
            return (
              <li key={player.playerId}>
                <button
                  type="button"
                  aria-pressed={!hidden}
                  className={`
                    flex items-center gap-2 rounded-md px-1 py-0.5
                    ${hidden ? 'text-(--cream)/35 line-through' : `
                      text-(--cream)/70
                    `}
                  `}
                  onClick={() =>
                    setHiddenPlayerIds((current) => {
                      const next = new Set(current);
                      if (next.has(player.playerId)) {
                        next.delete(player.playerId);
                      } else {
                        next.add(player.playerId);
                      }
                      return next;
                    })
                  }
                  onMouseEnter={() => {
                    if (!hidden) setLegendHighlightId(player.playerId);
                  }}
                  onMouseLeave={() => setLegendHighlightId(null)}
                  onFocus={() => {
                    if (!hidden) setLegendHighlightId(player.playerId);
                  }}
                  onBlur={() => setLegendHighlightId(null)}
                >
                  <span
                    aria-hidden="true"
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: colorFor(player.playerId), opacity: hidden ? 0.4 : 1 }}
                  />
                  {player.name}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
