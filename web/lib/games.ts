import { eq, desc, asc } from 'drizzle-orm'
import { games, gamePlayers, players } from '@/db/schema'
import { db } from './db'

export interface GamePlayer { playerId: number; score: number; isWinner: boolean }

export async function createGame(input: {
  playedAt: Date
  notes: string
  submittedFromIp: string | null
  players: GamePlayer[]
}) {
  await db.transaction(async (tx) => {
    const [{ id }] = await tx
      .insert(games)
      .values({ playedAt: input.playedAt, notes: input.notes, submittedFromIp: input.submittedFromIp })
      .returning({ id: games.id })
    if (input.players.length > 0) {
      await tx.insert(gamePlayers).values(
        input.players.map((p) => ({ gameId: id, playerId: p.playerId, score: p.score, isWinner: p.isWinner })),
      )
    }
  })
}

export async function updateGame(
  id: number,
  input: { playedAt: Date; notes: string; players: GamePlayer[] },
) {
  await db.transaction(async (tx) => {
    await tx.update(games).set({ playedAt: input.playedAt, notes: input.notes }).where(eq(games.id, id))
    await tx.delete(gamePlayers).where(eq(gamePlayers.gameId, id))
    if (input.players.length > 0) {
      await tx.insert(gamePlayers).values(
        input.players.map((p) => ({ gameId: id, playerId: p.playerId, score: p.score, isWinner: p.isWinner })),
      )
    }
  })
}

export async function deleteGame(id: number) {
  await db.delete(games).where(eq(games.id, id))
}

export function parseGameFormData(formData: FormData): {
  playedAt: Date
  notes: string
  players: GamePlayer[]
} {
  const playedAt = new Date(formData.get('played_at') as string)
  const notes = (formData.get('notes') as string) ?? ''
  const playersList: GamePlayer[] = []
  let row = 0
  while (formData.has(`player_id_${row}`)) {
    const playerId = formData.get(`player_id_${row}`) as string
    const score = formData.get(`score_${row}`) as string
    const isWinner = formData.get(`is_winner_${row}`) === '1'
    if (playerId && score !== null && score !== '') {
      playersList.push({ playerId: Number(playerId), score: Number(score), isWinner })
    }
    row += 1
  }
  const hasExplicitWinner = playersList.some((p) => p.isWinner)
  if (!hasExplicitWinner && playersList.length > 0) {
    const maxScore = Math.max(...playersList.map((p) => p.score))
    const topPlayers = playersList.filter((p) => p.score === maxScore)
    if (topPlayers.length === 1) {
      topPlayers[0].isWinner = true
    }
  }
  return { playedAt, notes, players: playersList }
}

export interface RecentGame {
  id: number
  playedAt: Date
  notes: string
  players: { playerName: string; score: number; isWinner: boolean }[]
}

interface GameRow {
  id: number
  playedAt: Date
  notes: string
  playerName: string
  score: number
  isWinner: boolean
}

function groupGameRows(rows: GameRow[]): RecentGame[] {
  const gamesMap = new Map<number, RecentGame>()
  rows.forEach((row) => {
    if (!gamesMap.has(row.id)) {
      gamesMap.set(row.id, { id: row.id, playedAt: row.playedAt, notes: row.notes, players: [] })
    }
    gamesMap.get(row.id)!.players.push({
      playerName: row.playerName,
      score: row.score,
      isWinner: row.isWinner,
    })
  })
  const uniqueGameIds = [...new Set(rows.map((r) => r.id))]
  return uniqueGameIds.map((id) => gamesMap.get(id)!)
}

export async function listRecentGames(limit = 20): Promise<RecentGame[]> {
  const rows = await db
    .select({
      id: games.id,
      playedAt: games.playedAt,
      notes: games.notes,
      playerName: players.name,
      score: gamePlayers.score,
      isWinner: gamePlayers.isWinner,
    })
    .from(games)
    .innerJoin(gamePlayers, eq(gamePlayers.gameId, games.id))
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .orderBy(desc(games.playedAt), desc(games.id), asc(players.name))
    .limit(limit * 10)
  return groupGameRows(rows).slice(0, limit)
}

export async function listAllGames(): Promise<RecentGame[]> {
  const rows = await db
    .select({
      id: games.id,
      playedAt: games.playedAt,
      notes: games.notes,
      playerName: players.name,
      score: gamePlayers.score,
      isWinner: gamePlayers.isWinner,
    })
    .from(games)
    .innerJoin(gamePlayers, eq(gamePlayers.gameId, games.id))
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .orderBy(desc(games.playedAt), desc(games.id), asc(players.name))
  return groupGameRows(rows)
}

export interface GameForEdit {
  id: number
  playedAt: Date
  notes: string
  players: { playerId: number; score: number; isWinner: boolean }[]
}

export async function getGameForEdit(id: number): Promise<GameForEdit | null> {
  const rows = await db
    .select({
      id: games.id,
      playedAt: games.playedAt,
      notes: games.notes,
      playerId: gamePlayers.playerId,
      score: gamePlayers.score,
      isWinner: gamePlayers.isWinner,
    })
    .from(games)
    .innerJoin(gamePlayers, eq(gamePlayers.gameId, games.id))
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .where(eq(games.id, id))
    .orderBy(asc(players.name))
  if (rows.length === 0) return null
  return {
    id: rows[0].id,
    playedAt: rows[0].playedAt,
    notes: rows[0].notes,
    players: rows.map((r) => ({ playerId: r.playerId, score: r.score, isWinner: r.isWinner })),
  }
}
