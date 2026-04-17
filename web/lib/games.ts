import { db } from './db'

type GamePlayer = { playerId: number; score: number; isWinner: boolean }

export async function createGame(input: {
  playedAt: Date
  notes: string
  submittedFromIp: string | null
  players: GamePlayer[]
}) {
  await db.begin(async (sql) => {
    const [game] = await sql`
      INSERT INTO games (played_at, notes, submitted_from_ip)
      VALUES (${input.playedAt}, ${input.notes}, ${input.submittedFromIp})
      RETURNING id
    `
    for (const p of input.players) {
      await sql`
        INSERT INTO game_players (game_id, player_id, score, is_winner)
        VALUES (${game.id}, ${p.playerId}, ${p.score}, ${p.isWinner})
      `
    }
  })
}

export type RecentGame = {
  id: number
  played_at: Date
  notes: string
  players: { playerName: string; score: number; isWinner: boolean }[]
}

type GameRow = {
  id: number
  played_at: Date
  notes: string
  player_name: string
  score: number
  is_winner: boolean
}

export async function listRecentGames(limit = 20): Promise<RecentGame[]> {
  const rows = await db<GameRow[]>`
    SELECT
      g.id,
      g.played_at,
      g.notes,
      p.name AS player_name,
      gp.score,
      gp.is_winner
    FROM games g
    JOIN game_players gp ON gp.game_id = g.id
    JOIN players p ON p.id = gp.player_id
    ORDER BY g.played_at DESC, g.id DESC, p.name ASC
    LIMIT ${limit * 10}
  `

  const gamesMap = new Map<number, RecentGame>()
  for (const row of rows) {
    if (!gamesMap.has(row.id)) {
      gamesMap.set(row.id, { id: row.id, played_at: row.played_at, notes: row.notes, players: [] })
    }
    gamesMap.get(row.id)!.players.push({
      playerName: row.player_name,
      score: row.score,
      isWinner: row.is_winner,
    })
  }

  const uniqueGameIds = [...new Set(rows.map((r) => r.id))].slice(0, limit)
  return uniqueGameIds.map((id) => gamesMap.get(id)!)
}
