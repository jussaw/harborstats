import type { PlayerRating, RatingHistoryPoint } from '@/lib/rating';

export interface SequenceAxisEntry {
  sequence: number;
  gameId: number;
  playedAt: string;
}

export interface TooltipRow {
  playerId: number;
  name: string;
  rating: number;
}

export interface ProvisionalSplit {
  provisional: RatingHistoryPoint[];
  established: RatingHistoryPoint[];
}

export interface HighlightCandidate {
  playerId: number;
  yView: number;
}

/**
 * Collapses every player's history into one shared x-axis keyed by sequence.
 *
 * Sequence maps one-to-one to a rated game, so any player's point at a given
 * sequence carries the same game id and date; the first one wins. The result
 * is sorted ascending and covers every sequence that appears in any series.
 */
export function buildSequenceAxis(players: PlayerRating[]): SequenceAxisEntry[] {
  const bySequence = new Map<number, SequenceAxisEntry>();
  players.forEach((player) => {
    player.history.forEach((point) => {
      if (!bySequence.has(point.sequence)) {
        bySequence.set(point.sequence, {
          sequence: point.sequence,
          gameId: point.gameId,
          playedAt: point.playedAt,
        });
      }
    });
  });
  return [...bySequence.values()].sort((left, right) => left.sequence - right.sequence);
}

/**
 * Splits a player's history at the point where their rating stops being
 * provisional — the moment of their Nth game actually played. Carried-forward
 * snapshots (games they sat out) do not count toward that total. The boundary
 * point belongs to both slices so the dashed and solid line segments join
 * without a gap. A player who never reaches N played games is all-provisional.
 */
export function splitProvisionalSegments(
  history: RatingHistoryPoint[],
  provisionalGames: number,
): ProvisionalSplit {
  let played = 0;
  let boundaryIndex = -1;
  for (let index = 0; index < history.length; index += 1) {
    if (history[index].participated) {
      played += 1;
      if (played === provisionalGames) {
        boundaryIndex = index;
        break;
      }
    }
  }

  if (boundaryIndex === -1) {
    return { provisional: history, established: [] };
  }

  return {
    provisional: history.slice(0, boundaryIndex + 1),
    established: history.slice(boundaryIndex),
  };
}

/**
 * Builds the crosshair tooltip rows: every visible player that has a rating at
 * the snapped game, ranked by rating descending (ties broken by name). Players
 * who had not yet debuted at that game have no point and are omitted.
 */
export function buildTooltipRows(
  players: PlayerRating[],
  hiddenPlayerIds: ReadonlySet<number>,
  sequence: number,
): TooltipRow[] {
  return players
    .filter((player) => !hiddenPlayerIds.has(player.playerId))
    .map((player) => {
      const point = player.history.find((entry) => entry.sequence === sequence);
      return point ? { playerId: player.playerId, name: player.name, rating: point.rating } : null;
    })
    .filter((row): row is TooltipRow => row !== null)
    .sort((left, right) => right.rating - left.rating || left.name.localeCompare(right.name));
}

/**
 * Maps a pointer x (in viewBox units) to the nearest game sequence.
 */
export function nearestSequenceForX(
  xView: number,
  { left, plotWidth, maxSequence }: { left: number; plotWidth: number; maxSequence: number },
): number {
  if (maxSequence === 0 || plotWidth <= 0) return 0;
  const ratio = (xView - left) / plotWidth;
  const raw = Math.round(ratio * maxSequence);
  return Math.min(maxSequence, Math.max(0, raw));
}

/**
 * Picks the line closest to the pointer's y at the crosshair, but only when it
 * is within the threshold. Returns null when the pointer is not near any line,
 * which leaves every line at full opacity.
 */
export function highlightForY(
  candidates: HighlightCandidate[],
  pointerYView: number,
  thresholdView: number,
): number | null {
  const best = candidates.reduce<{ playerId: number; distance: number } | null>((acc, candidate) => {
    const distance = Math.abs(candidate.yView - pointerYView);
    if (acc === null || distance < acc.distance) {
      return { playerId: candidate.playerId, distance };
    }
    return acc;
  }, null);
  if (best === null || best.distance > thresholdView) return null;
  return best.playerId;
}

/**
 * Sparse x-axis labels: the first, middle, and last games actually present on
 * the axis. Keys off axis position rather than a numeric range so a single
 * player who debuted after game zero still labels their own first game.
 */
export function getXAxisLabelSequences(axis: SequenceAxisEntry[]): number[] {
  if (axis.length === 0) return [];
  const first = axis[0].sequence;
  const last = axis[axis.length - 1].sequence;
  const middle = axis[Math.floor((axis.length - 1) / 2)].sequence;
  return [...new Set([first, middle, last])].sort((a, b) => a - b);
}
