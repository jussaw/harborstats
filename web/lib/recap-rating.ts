import type { RatingReplay } from '@/lib/rating';

/**
 * A single participant's rating movement caused by one specific game, derived
 * strictly from the canonical rating replay. `ratingAfter` is the player's Elo
 * immediately after this game; `ratingBefore` is `ratingAfter - change`. All
 * values are the raw (unrounded) replay numbers; round only for display.
 */
export interface RecapRatingImpact {
  playerId: number;
  ratingBefore: number;
  ratingAfter: number;
  change: number;
}

/**
 * Extracts the as-of-this-game rating impact for every participant that the
 * replay actually rated in the given game. A player is included only when the
 * replay recorded a history point for this `gameId` in which they participated;
 * games the replay never rated (solo games, games with no winner, players
 * missing a replay point) yield no entry, so callers must treat an absent
 * participant as unrated rather than inventing a zero-change card.
 *
 * Pure and self-contained: it reads only the replay output and never re-runs or
 * changes the Elo math. Returns a map keyed by `playerId` for O(1) lookup.
 */
export function getGameRatingImpacts(
  replay: RatingReplay,
  gameId: number,
): Map<number, RecapRatingImpact> {
  return replay.players.reduce((impacts, player) => {
    const point = player.history.find(
      (entry) => entry.gameId === gameId && entry.participated,
    );
    if (point) {
      impacts.set(player.playerId, {
        playerId: player.playerId,
        ratingAfter: point.rating,
        change: point.change,
        ratingBefore: point.rating - point.change,
      });
    }
    return impacts;
  }, new Map<number, RecapRatingImpact>());
}

/**
 * Formats a rating delta for display with an explicit textual sign so the
 * direction never depends on colour alone. Rounds to a whole Elo point and uses
 * a true minus sign for readability.
 */
export function formatRatingChange(change: number): string {
  const rounded = Math.round(change);
  if (rounded > 0) return `+${rounded}`;
  if (rounded < 0) return `−${Math.abs(rounded)}`;
  return '±0';
}
