import { db } from './db'

export type GamePlayer = { playerId: number; score: number; isWinner: boolean }

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

export async function updateGame(
  id: number,
  input: { playedAt: Date; notes: string; players: GamePlayer[] },
) {
  await db.begin(async (sql) => {
    await sql`
      UPDATE games SET played_at = ${input.playedAt}, notes = ${input.notes}
      WHERE id = ${id}
    `
    await sql`DELETE FROM game_players WHERE game_id = ${id}`
    for (const p of input.players) {
      await sql`
        INSERT INTO game_players (game_id, player_id, score, is_winner)
        VALUES (${id}, ${p.playerId}, ${p.score}, ${p.isWinner})
      `
    }
  })
}

export async function deleteGame(id: number) {
  await db`DELETE FROM games WHERE id = ${id}`
}

export function parseGameFormData(formData: FormData): {
  playedAt: Date
  notes: string
  players: GamePlayer[]
} {
  const playedAt = new Date(formData.get('played_at') as string)
  const notes = (formData.get('notes') as string) ?? ''
  const players: GamePlayer[] = []
  let row = 0
  while (formData.has(`player_id_${row}`)) {
    const playerId = formData.get(`player_id_${row}`) as string
    const score = formData.get(`score_${row}`) as string
    const isWinner = formData.get(`is_winner_${row}`) === '1'
    if (playerId && score !== null && score !== '') {
      players.push({ playerId: Number(playerId), score: Number(score), isWinner })
    }
    row += 1
  }
  return { playedAt, notes, players }
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

function groupGameRows(rows: GameRow[]): RecentGame[] {
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
  const uniqueGameIds = [...new Set(rows.map((r) => r.id))]
  return uniqueGameIds.map((id) => gamesMap.get(id)!)
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
  return groupGameRows(rows).slice(0, limit)
}

export async function listAllGames(): Promise<RecentGame[]> {
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
  `
  return groupGameRows(rows)
}

export interface GameForEdit {
  id: number
  played_at: Date
  notes: string
  players: { playerId: number; score: number; isWinner: boolean }[]
}

export async function getGameForEdit(id: number): Promise<GameForEdit | null> {
  const rows = await db<
    {
      id: number
      played_at: Date
      notes: string
      player_id: number
      score: number
      is_winner: boolean
    }[]
  >`
    SELECT g.id, g.played_at, g.notes, gp.player_id, gp.score, gp.is_winner
    FROM games g
    JOIN game_players gp ON gp.game_id = g.id
    JOIN players p ON p.id = gp.player_id
    WHERE g.id = ${id}
    ORDER BY p.name ASC
  `
  if (rows.length === 0) return null
  return {
    id: rows[0].id,
    played_at: rows[0].played_at,
    notes: rows[0].notes,
    players: rows.map((r) => ({ playerId: r.player_id, score: r.score, isWinner: r.is_winner })),
  }
}
