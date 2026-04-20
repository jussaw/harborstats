import { eq, desc, asc, count, inArray } from 'drizzle-orm'
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

export const DEFAULT_RECENT_GAMES_LIMIT = 10
export const GAMES_PAGE_SIZES = [20, 50, 100] as const

export type GamesPageSize = (typeof GAMES_PAGE_SIZES)[number]

export interface GamesPage {
  games: RecentGame[]
  totalGames: number
  page: number
  pageSize: number
  totalPages: number
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

export async function listRecentGames(limit = DEFAULT_RECENT_GAMES_LIMIT): Promise<RecentGame[]> {
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

export async function listGamesPage(page = 1, pageSize = 20): Promise<GamesPage> {
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 20
  const safePage = Number.isInteger(page) && page > 0 ? page : 1

  const [{ totalGames }] = await db.select({ totalGames: count() }).from(games)
  const totalPages = totalGames === 0 ? 0 : Math.ceil(totalGames / safePageSize)
  const currentPage = totalPages === 0 ? 1 : Math.min(safePage, totalPages)

  if (totalGames === 0) {
    return { games: [], totalGames, page: currentPage, pageSize: safePageSize, totalPages }
  }

  const pageGames = await db
    .select({
      id: games.id,
      playedAt: games.playedAt,
      notes: games.notes,
    })
    .from(games)
    .orderBy(desc(games.playedAt), desc(games.id))
    .limit(safePageSize)
    .offset((currentPage - 1) * safePageSize)

  const gameIds = pageGames.map((game) => game.id)
  if (gameIds.length === 0) {
    return { games: [], totalGames, page: currentPage, pageSize: safePageSize, totalPages }
  }

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
    .where(inArray(games.id, gameIds))
    .orderBy(desc(games.playedAt), desc(games.id), asc(players.name))

  const groupedGames = new Map(groupGameRows(rows).map((game) => [game.id, game]))

  return {
    games: gameIds.map((id) => groupedGames.get(id)).filter((game): game is RecentGame => Boolean(game)),
    totalGames,
    page: currentPage,
    pageSize: safePageSize,
    totalPages,
  }
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
