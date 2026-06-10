import type { RecentGame } from '@/lib/games'

const CSV_HEADER = 'game_id,played_at,notes,player,score,is_winner'

// RFC 4180: quote fields containing commas, quotes, or line breaks, and
// double any embedded quotes. Notes and player names are free text.
function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
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
