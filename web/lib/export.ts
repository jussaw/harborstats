import type { RecentGame } from '@/lib/games'

const CSV_HEADER = 'game_id,played_at,notes,player,score,is_winner'

// Neutralize spreadsheet formula injection (CWE-1236): a cell that a
// spreadsheet would interpret as a formula (leads with =, +, -, @, or a
// tab/CR) is prefixed with a single quote so Excel/Sheets renders it as text.
// Notes and player names are attacker-influenced free text, so this runs before
// RFC-4180 quoting.
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value
}

// RFC 4180: quote fields containing commas, quotes, or line breaks, and
// double any embedded quotes. Notes and player names are free text.
function escapeCsvField(value: string): string {
  const guarded = neutralizeFormula(value)
  if (/[",\n\r]/.test(guarded)) {
    return `"${guarded.replace(/"/g, '""')}"`
  }
  return guarded
}

/**
 * Serializes games in long format: one row per player appearance, so the file
 * loads directly into a spreadsheet or dataframe without unpacking nesting.
 */
export function gamesToCsv(games: RecentGame[]): string {
  const rows = games.flatMap((game) =>
    game.players.map((player) =>
      [
        String(game.id),
        game.playedAt.toISOString(),
        escapeCsvField(game.notes),
        escapeCsvField(player.playerName),
        String(player.score),
        player.isWinner ? 'true' : 'false',
      ].join(','),
    ),
  )
  return `${[CSV_HEADER, ...rows].join('\r\n')}\r\n`
}
