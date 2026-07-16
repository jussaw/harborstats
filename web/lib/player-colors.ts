export const PLAYER_COLOR_COUNT = 16;

/**
 * Maps each roster player id to a stable categorical color.
 *
 * Colors follow player identity, never rank or cohort membership: ids are
 * sorted ascending and the ordinal position (mod the palette size) picks the
 * color. Because assignment is append-only, adding a new player takes the next
 * color and never shifts the colors of existing players, and filtering the
 * displayed cohort never repaints the survivors.
 *
 * Pass the FULL roster of player ids so ordinals are stable across charts, not
 * the filtered subset a single chart happens to show.
 */
export function buildPlayerColorMap(rosterPlayerIds: number[]): Map<number, string> {
  const sorted = [...new Set(rosterPlayerIds)].sort((a, b) => a - b);
  return new Map(
    sorted.map((id, index) => [id, `var(--player-color-${(index % PLAYER_COLOR_COUNT) + 1})`]),
  );
}
