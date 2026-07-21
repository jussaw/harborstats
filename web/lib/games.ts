import { and, asc, count, desc, eq, gte, inArray, lte } from 'drizzle-orm'
import { games, gamePlayers, players } from '@/db/schema'
import type { GamesPageFilters } from '@/lib/games-page-shared'
import { db } from './db'

export interface GamePlayer { playerId: number; score: number; isWinner: boolean }

/** Validation failure whose message is safe to show to the user. */
export class GameValidationError extends Error {}

/** Result shape returned by the create/update game server actions. */
export interface GameActionResult {
  ok: boolean
  error?: string
}

/**
 * Maps an error thrown while saving a game to a user-facing action result.
 * Validation messages pass through; anything else (DB failures, bugs) gets a
 * generic message so internals don't leak to the client.
 */
export function gameActionError(err: unknown): GameActionResult {
  if (err instanceof GameValidationError) {
    return { ok: false, error: err.message }
  }
  return { ok: false, error: 'Something went wrong saving the game. Please try again.' }
}

const MIN_SCORE = 0
// Upper bound is mirrored by the game_players_score_check DB constraint in
// db/schema.ts — change both together.
const MAX_SCORE = 30

function assertValidPlayedAt(playedAt: Date) {
  if (!(playedAt instanceof Date) || !Number.isFinite(playedAt.getTime())) {
    throw new GameValidationError('Played date must be valid.')
  }
}

function validateAndNormalizeGamePlayers(inputPlayers: GamePlayer[]): GamePlayer[] {
  if (inputPlayers.length === 0) {
    throw new GameValidationError('Game must include at least one player.')
  }

  const seenPlayerIds = new Set<number>()
  inputPlayers.forEach((player) => {
    if (!Number.isInteger(player.playerId) || player.playerId <= 0) {
      throw new GameValidationError('Player id must be a positive integer.')
    }

    if (!Number.isInteger(player.score) || player.score < MIN_SCORE || player.score > MAX_SCORE) {
      throw new GameValidationError('Score must be an integer from 0 to 30.')
    }

    if (seenPlayerIds.has(player.playerId)) {
      throw new GameValidationError('Each player can only appear once per game.')
    }
    seenPlayerIds.add(player.playerId)
  })

  const explicitWinnerCount = inputPlayers.filter((player) => player.isWinner).length
  if (explicitWinnerCount > 1) {
    throw new GameValidationError('Game must have exactly one winner.')
  }

  if (explicitWinnerCount === 1) {
    return inputPlayers.map((player) => ({ ...player }))
  }

  const maxScore = Math.max(...inputPlayers.map((player) => player.score))
  const topPlayers = inputPlayers.filter((player) => player.score === maxScore)
  if (topPlayers.length !== 1) {
    throw new GameValidationError('Tie games require an explicit single winner.')
  }

  const normalizedPlayers = inputPlayers.map((player) => ({
    ...player,
    isWinner: player.playerId === topPlayers[0].playerId,
  }))

  if (normalizedPlayers.filter((player) => player.isWinner).length !== 1) {
    throw new GameValidationError('Game must have exactly one winner.')
  }

  return normalizedPlayers
}

export async function createGame(input: {
  playedAt: Date
  notes: string
  submittedFromIp: string | null
  players: GamePlayer[]
}) {
  assertValidPlayedAt(input.playedAt)
  const normalizedPlayers = validateAndNormalizeGamePlayers(input.players)

  return db.transaction(async (tx) => {
    const [{ id }] = await tx
      .insert(games)
      .values({ playedAt: input.playedAt, notes: input.notes, submittedFromIp: input.submittedFromIp })
      .returning({ id: games.id })
    await tx.insert(gamePlayers).values(
      normalizedPlayers.map((p) => ({ gameId: id, playerId: p.playerId, score: p.score, isWinner: p.isWinner })),
    )
    return id
  })
}

export async function updateGame(
  id: number,
  input: { playedAt: Date; notes: string; players: GamePlayer[] },
) {
  assertValidPlayedAt(input.playedAt)
  const normalizedPlayers = validateAndNormalizeGamePlayers(input.players)

  await db.transaction(async (tx) => {
    await tx.update(games).set({ playedAt: input.playedAt, notes: input.notes }).where(eq(games.id, id))
    await tx.delete(gamePlayers).where(eq(gamePlayers.gameId, id))
    await tx.insert(gamePlayers).values(
      normalizedPlayers.map((p) => ({ gameId: id, playerId: p.playerId, score: p.score, isWinner: p.isWinner })),
    )
  })
}

/**
 * Deletes a game (its `game_players` cascade via the FK). Returns `true` when a
 * row actually matched and was removed, `false` when no game had that id — so
 * callers can tell a real deletion from a stale/double delete and avoid
 * recording a success audit for a no-op.
 */
export async function deleteGame(id: number): Promise<boolean> {
  const deleted = await db.delete(games).where(eq(games.id, id)).returning({ id: games.id })
  return deleted.length > 0
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

function getGamesPageWhere(filters: GamesPageFilters) {
  const conditions = []

  if (filters.playerIds.length > 0) {
    conditions.push(
      inArray(
        games.id,
        db
          .select({ id: gamePlayers.gameId })
          .from(gamePlayers)
          .where(inArray(gamePlayers.playerId, filters.playerIds)),
      ),
    )
  }

  if (filters.from) {
    conditions.push(gte(games.playedAt, filters.from))
  }

  if (filters.to) {
    conditions.push(lte(games.playedAt, filters.to))
  }

  if (conditions.length === 0) {
    return undefined
  }

  return and(...conditions)
}

export async function listRecentGames(limit = DEFAULT_RECENT_GAMES_LIMIT): Promise<RecentGame[]> {
  // Pick the games first so the limit applies to games, not joined player rows;
  // otherwise a game with many participants would be truncated or dropped.
  const recentGames = await db
    .select({ id: games.id })
    .from(games)
    .orderBy(desc(games.playedAt), desc(games.id))
    .limit(limit)

  const gameIds = recentGames.map((game) => game.id)
  if (gameIds.length === 0) {
    return []
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
  return groupGameRows(rows)
}

export async function listGamesForPlayer(playerId: number): Promise<RecentGame[]> {
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
    .where(
      inArray(
        games.id,
        db
          .select({ id: gamePlayers.gameId })
          .from(gamePlayers)
          .where(eq(gamePlayers.playerId, playerId)),
      ),
    )
    .orderBy(desc(games.playedAt), desc(games.id), asc(players.name))

  return groupGameRows(rows)
}

export async function listGamesPage(
  page = 1,
  pageSize = 20,
  filters: GamesPageFilters = { playerIds: [], from: null, to: null },
): Promise<GamesPage> {
  const safePageSize = Number.isInteger(pageSize) && pageSize > 0 ? pageSize : 20
  const safePage = Number.isInteger(page) && page > 0 ? page : 1
  const where = getGamesPageWhere(filters)

  const [{ totalGames }] = await db.select({ totalGames: count() }).from(games).where(where)
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
    .where(where)
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
