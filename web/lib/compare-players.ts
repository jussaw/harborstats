// Tie-break for leaderboards: case-insensitive name like `playerNameOrder`
// (COLLATE NOCASE), then id, so rows tied on every stat never fall back to
// the database's row order (Postgres hash order and SQLite id order differ).
// Pure on purpose: pages import it without loading the database layer.
export function comparePlayerNames(
  a: { playerId: number; name: string },
  b: { playerId: number; name: string },
): number {
  const left = a.name.toLowerCase();
  const right = b.name.toLowerCase();
  if (left !== right) return left < right ? -1 : 1;
  return a.playerId - b.playerId;
}
