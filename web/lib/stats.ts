import { count, desc, eq, sql } from 'drizzle-orm'
import { gamePlayers, games, players } from '@/db/schema'
import { parsePlayerTier, PlayerTier, type PlayerTier as PlayerTierType } from '@/lib/player-tier'
import { db } from './db'

function round1(value: number): number {
  return Math.round(value * 10) / 10
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000
}

function getMedian(values: number[]): number {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }

  return sorted[middle]
}

function startOfUtcDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

function getIsoWeekStart(date: Date): Date {
  const start = startOfUtcDay(date)
  const day = start.getUTCDay()
  const offset = day === 0 ? 6 : day - 1
  start.setUTCDate(start.getUTCDate() - offset)
  return start
}

function getUtcMonthStart(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

function addUtcDays(date: Date, days: number): Date {
  const next = new Date(date)
  next.setUTCDate(next.getUTCDate() + days)
  return next
}

function addUtcMonths(date: Date, months: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1))
}

function formatShortUtcDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
  })
}

function formatShortUtcMonth(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    year: 'numeric',
  })
}

function formatLongUtcDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    timeZone: 'UTC',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function toUtcDateKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

interface PlayerIdentity {
  playerId: number
  name: string
  tier: PlayerTierType
}

interface PlayerGameSizeAccumulator extends PlayerIdentity {
  playerCount: number
  games: number
  wins: number
  expectedWins: number
}

interface PlayerExpectedWinsAccumulator extends PlayerIdentity {
  games: number
  wins: number
  expectedWins: number
}

interface TierShowdownAccumulator {
  tier: PlayerTierType
  players: number
  appearances: number
  wins: number
}

interface GameSizeAggregateData {
  playerWinRateByGameSize: PlayerWinRateByGameSize[]
  playerExpectedVsActualWins: PlayerExpectedVsActualWins[]
  tierShowdownStats: TierShowdownStats[]
}

async function getGameSizeAggregateData(): Promise<GameSizeAggregateData> {
  const [playerRows, participantRows] = await Promise.all([
    db
      .select({
        playerId: players.id,
        name: players.name,
        tier: players.tier,
      })
      .from(players)
      .orderBy(sql`CASE ${players.tier} WHEN 'premium' THEN 0 ELSE 1 END`, players.name),
    db
      .select({
        gameId: gamePlayers.gameId,
        playerId: gamePlayers.playerId,
        isWinner: gamePlayers.isWinner,
      })
      .from(gamePlayers),
  ])

  const playersById = new Map<number, PlayerIdentity>(
    playerRows.map((player) => [
      player.playerId,
      {
        playerId: player.playerId,
        name: player.name,
        tier: parsePlayerTier(player.tier),
      },
    ]),
  )

  const expectedWinsByPlayerId = new Map<number, PlayerExpectedWinsAccumulator>(
    playerRows.map((player) => [
      player.playerId,
      {
        playerId: player.playerId,
        name: player.name,
        tier: parsePlayerTier(player.tier),
        games: 0,
        wins: 0,
        expectedWins: 0,
      },
    ]),
  )

  const tierStats: Record<PlayerTier, TierShowdownAccumulator> = {
    [PlayerTier.Premium]: {
      tier: PlayerTier.Premium,
      players: playerRows.filter((player) => parsePlayerTier(player.tier) === PlayerTier.Premium).length,
      appearances: 0,
      wins: 0,
    },
    [PlayerTier.Standard]: {
      tier: PlayerTier.Standard,
      players: playerRows.filter((player) => parsePlayerTier(player.tier) === PlayerTier.Standard).length,
      appearances: 0,
      wins: 0,
    },
  }

  const gameSizeBuckets = new Map<string, PlayerGameSizeAccumulator>()
  const participantsByGameId = new Map<number, typeof participantRows>()

  participantRows.forEach((participant) => {
    const existing = participantsByGameId.get(participant.gameId) ?? []
    existing.push(participant)
    participantsByGameId.set(participant.gameId, existing)
  })

  participantsByGameId.forEach((participants) => {
    const playerCount = participants.length
    if (playerCount === 0) {
      return
    }

    const expectedWinShare = 1 / playerCount

    participants.forEach((participant) => {
      const player = playersById.get(participant.playerId)
      const expectedWins = expectedWinsByPlayerId.get(participant.playerId)
      if (!player || !expectedWins) {
        return
      }

      expectedWins.games += 1
      expectedWins.wins += participant.isWinner ? 1 : 0
      expectedWins.expectedWins += expectedWinShare

      const tier = tierStats[player.tier]
      if (tier) {
        tier.appearances += 1
        tier.wins += participant.isWinner ? 1 : 0
      }

      const key = `${participant.playerId}:${playerCount}`
      const bucket = gameSizeBuckets.get(key) ?? {
        ...player,
        playerCount,
        games: 0,
        wins: 0,
        expectedWins: 0,
      }

      bucket.games += 1
      bucket.wins += participant.isWinner ? 1 : 0
      bucket.expectedWins += expectedWinShare

      gameSizeBuckets.set(key, bucket)
    })
  })

  return {
    playerWinRateByGameSize: [...gameSizeBuckets.values()]
      .map((bucket) => ({
        playerId: bucket.playerId,
        name: bucket.name,
        tier: bucket.tier,
        playerCount: bucket.playerCount,
        games: bucket.games,
        wins: bucket.wins,
        winRate: bucket.games > 0 ? bucket.wins / bucket.games : 0,
      }))
      .sort(
        (a, b) => a.playerId - b.playerId
          || a.playerCount - b.playerCount
          || b.winRate - a.winRate,
      ),
    playerExpectedVsActualWins: [...expectedWinsByPlayerId.values()]
      .map((player) => ({
        playerId: player.playerId,
        name: player.name,
        tier: player.tier,
        games: player.games,
        wins: player.wins,
        expectedWins: round1(player.expectedWins),
        winDelta: round1(player.wins - player.expectedWins),
      }))
      .sort(
        (a, b) => b.winDelta - a.winDelta
          || b.wins - a.wins
          || b.expectedWins - a.expectedWins
          || a.name.localeCompare(b.name),
      ),
    tierShowdownStats: Object.values(tierStats)
      .map((tier) => ({
        tier: tier.tier,
        players: tier.players,
        appearances: tier.appearances,
        wins: tier.wins,
        winRate: tier.appearances > 0 ? tier.wins / tier.appearances : 0,
      }))
      .sort(
        (a, b) => b.winRate - a.winRate
          || b.wins - a.wins
          || a.tier.localeCompare(b.tier),
      ),
  }
}

export interface PlayerWinRate {
  playerId: number
  name: string
  tier: PlayerTierType
  games: number
  wins: number
  winRate: number // 0.0–1.0
}

export async function getPlayerWinRates(): Promise<PlayerWinRate[]> {
  const rows = await db
    .select({
      playerId: players.id,
      name: players.name,
      tier: players.tier,
      games: count(gamePlayers.id),
      wins: sql<number>`cast(count(*) filter (where ${gamePlayers.isWinner} = true) as integer)`,
    })
    .from(players)
    .leftJoin(gamePlayers, eq(gamePlayers.playerId, players.id))
    .groupBy(players.id)

  return rows
    .map((row) => ({
      ...row,
      tier: parsePlayerTier(row.tier),
      winRate: row.games > 0 ? row.wins / row.games : 0,
    }))
    .sort((a, b) => b.wins - a.wins || b.winRate - a.winRate)
}

export interface PlayerScoreStats {
  playerId: number
  name: string
  tier: PlayerTierType
  games: number
  avgScore: number
  medianScore: number
}

export async function getPlayerScoreStats(): Promise<PlayerScoreStats[]> {
  const rows = await db
    .select({
      playerId: players.id,
      name: players.name,
      tier: players.tier,
      games: count(gamePlayers.id),
      avgScore: sql<number>`AVG(${gamePlayers.score})`,
      medianScore: sql<number>`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY ${gamePlayers.score})`,
    })
    .from(players)
    .innerJoin(gamePlayers, eq(gamePlayers.playerId, players.id))
    .groupBy(players.id)

  return rows
    .map((row) => ({
      ...row,
      tier: parsePlayerTier(row.tier),
      avgScore: round1(row.avgScore),
      medianScore: round1(row.medianScore),
    }))
    .sort((a, b) => b.avgScore - a.avgScore)
}

interface PlayerNormalizedScoreAccumulator extends PlayerIdentity {
  normalizedScores: number[]
}

export interface PlayerNormalizedScoreStats {
  playerId: number
  name: string
  tier: PlayerTierType
  games: number
  avgScore: number
  medianScore: number
}

export async function getPlayerNormalizedScoreStats(): Promise<PlayerNormalizedScoreStats[]> {
  const rows = await db
    .select({
      gameId: gamePlayers.gameId,
      playerId: players.id,
      name: players.name,
      tier: players.tier,
      score: gamePlayers.score,
      isWinner: gamePlayers.isWinner,
    })
    .from(gamePlayers)
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .orderBy(gamePlayers.gameId, players.id)

  const participantsByGameId = new Map<number, typeof rows>()

  rows.forEach((row) => {
    const existing = participantsByGameId.get(row.gameId) ?? []
    existing.push(row)
    participantsByGameId.set(row.gameId, existing)
  })

  const normalizedScoresByPlayerId = new Map<number, PlayerNormalizedScoreAccumulator>()

  participantsByGameId.forEach((participants) => {
    const winnerScores = participants.filter((participant) => participant.isWinner).map((participant) => participant.score)
    const winningScore = winnerScores.length > 0
      ? Math.max(...winnerScores)
      : Math.max(...participants.map((participant) => participant.score))

    if (winningScore <= 0) {
      return
    }

    participants.forEach((participant) => {
      const existing = normalizedScoresByPlayerId.get(participant.playerId) ?? {
        playerId: participant.playerId,
        name: participant.name,
        tier: parsePlayerTier(participant.tier),
        normalizedScores: [],
      }

      existing.normalizedScores.push(participant.score / winningScore)
      normalizedScoresByPlayerId.set(participant.playerId, existing)
    })
  })

  return [...normalizedScoresByPlayerId.values()]
    .map((player) => ({
      playerId: player.playerId,
      name: player.name,
      tier: player.tier,
      games: player.normalizedScores.length,
      avgScore: round3(
        player.normalizedScores.reduce((sum, score) => sum + score, 0) / player.normalizedScores.length,
      ),
      medianScore: round3(getMedian(player.normalizedScores)),
    }))
    .sort(
      (a, b) => b.avgScore - a.avgScore
        || b.medianScore - a.medianScore
        || a.name.localeCompare(b.name),
    )
}

export interface PlayerPodiumRate {
  playerId: number
  name: string
  tier: PlayerTierType
  games: number
  podiums: number
  podiumRate: number // 0.0–1.0
}

export async function getPlayerPodiumRates(): Promise<PlayerPodiumRate[]> {
  const result = await db.execute(sql`
    WITH ranked AS (
      SELECT
        gp.player_id,
        RANK() OVER (PARTITION BY gp.game_id ORDER BY gp.score DESC) AS finish_rank
      FROM game_players gp
    )
    SELECT
      p.id          AS "playerId",
      p.name,
      p.tier,
      COUNT(r.player_id)::integer           AS games,
      SUM(CASE WHEN r.finish_rank <= 2 THEN 1 ELSE 0 END)::integer AS podiums
    FROM players p
    LEFT JOIN ranked r ON r.player_id = p.id
    GROUP BY p.id, p.name, p.tier
    ORDER BY podiums DESC
  `)

  return (result as Record<string, unknown>[])
    .map((row) => {
      const gameCount = row.games as number
      const podiums = row.podiums as number
      return {
        playerId: row.playerId as number,
        name: row.name as string,
        tier: parsePlayerTier(row.tier as string),
        games: gameCount,
        podiums,
        podiumRate: gameCount > 0 ? podiums / gameCount : 0,
      }
    })
    .sort((a, b) => b.podiumRate - a.podiumRate || b.podiums - a.podiums)
}

export interface PlayerFinishBreakdown {
  playerId: number
  name: string
  tier: PlayerTierType
  games: number
  firsts: number
  seconds: number
  thirds: number
  lasts: number
  firstRate: number
  secondRate: number
  thirdRate: number
  lastRate: number
}

export async function getPlayerFinishBreakdowns(): Promise<PlayerFinishBreakdown[]> {
  const result = await db.execute(sql`
    WITH ranked AS (
      SELECT
        gp.player_id,
        gp.game_id,
        gp.score,
        RANK() OVER (PARTITION BY gp.game_id ORDER BY gp.score DESC) AS finish_rank,
        MIN(gp.score) OVER (PARTITION BY gp.game_id)                 AS lowest_score
      FROM game_players gp
    )
    SELECT
      p.id AS "playerId",
      p.name,
      p.tier,
      COUNT(r.game_id)::integer                                    AS games,
      SUM(CASE WHEN r.finish_rank = 1 THEN 1 ELSE 0 END)::integer  AS firsts,
      SUM(CASE WHEN r.finish_rank = 2 THEN 1 ELSE 0 END)::integer  AS seconds,
      SUM(CASE WHEN r.finish_rank = 3 THEN 1 ELSE 0 END)::integer  AS thirds,
      SUM(CASE WHEN r.score = r.lowest_score THEN 1 ELSE 0 END)::integer AS lasts
    FROM players p
    LEFT JOIN ranked r ON r.player_id = p.id
    GROUP BY p.id, p.name, p.tier
  `)

  return (result as Record<string, unknown>[])
    .map((row) => {
      const gameCount = row.games as number
      const firsts = row.firsts as number
      const seconds = row.seconds as number
      const thirds = row.thirds as number
      const lasts = row.lasts as number

      return {
        playerId: row.playerId as number,
        name: row.name as string,
        tier: parsePlayerTier(row.tier as string),
        games: gameCount,
        firsts,
        seconds,
        thirds,
        lasts,
        firstRate: gameCount > 0 ? firsts / gameCount : 0,
        secondRate: gameCount > 0 ? seconds / gameCount : 0,
        thirdRate: gameCount > 0 ? thirds / gameCount : 0,
        lastRate: gameCount > 0 ? lasts / gameCount : 0,
      }
    })
    .sort(
      (a, b) => b.firstRate - a.firstRate
        || b.firsts - a.firsts
        || b.secondRate - a.secondRate
        || b.thirdRate - a.thirdRate
        || a.lastRate - b.lastRate
        || b.games - a.games
        || a.name.localeCompare(b.name),
    )
}

export interface PlayerMarginStats {
  playerId: number
  name: string
  tier: PlayerTierType
  winGames: number
  lossGames: number
  averageVictoryMargin: number | null
  averageDefeatMargin: number | null
}

interface PlayerMarginAccumulator {
  playerId: number
  name: string
  tier: PlayerTierType
  winGames: number
  lossGames: number
  victoryMarginTotal: number
  defeatMarginTotal: number
}

export async function getPlayerMarginStats(): Promise<PlayerMarginStats[]> {
  const [playerRows, participantRows] = await Promise.all([
    db
      .select({
        playerId: players.id,
        name: players.name,
        tier: players.tier,
      })
      .from(players)
      .orderBy(sql`CASE ${players.tier} WHEN 'premium' THEN 0 ELSE 1 END`, players.name),
    db
      .select({
        gameId: gamePlayers.gameId,
        playerId: gamePlayers.playerId,
        score: gamePlayers.score,
        isWinner: gamePlayers.isWinner,
      })
      .from(gamePlayers),
  ])

  const statsByPlayerId = new Map<number, PlayerMarginAccumulator>(
    playerRows.map((player) => [
      player.playerId,
      {
        playerId: player.playerId,
        name: player.name,
        tier: parsePlayerTier(player.tier),
        winGames: 0,
        lossGames: 0,
        victoryMarginTotal: 0,
        defeatMarginTotal: 0,
      },
    ]),
  )

  const participantsByGameId = new Map<number, typeof participantRows>()

  participantRows.forEach((row) => {
    const existing = participantsByGameId.get(row.gameId) ?? []
    existing.push(row)
    participantsByGameId.set(row.gameId, existing)
  })

  participantsByGameId.forEach((participants) => {
    const winners = participants.filter((participant) => participant.isWinner)
    if (winners.length === 0) {
      return
    }

    const losers = participants.filter((participant) => !participant.isWinner)
    const bestNonWinnerScore = losers.length > 0
      ? Math.max(...losers.map((participant) => participant.score))
      : null
    const bestRecordedWinnerScore = Math.max(...winners.map((participant) => participant.score))

    winners.forEach((winner) => {
      const stats = statsByPlayerId.get(winner.playerId)
      if (!stats) return

      stats.winGames += 1
      stats.victoryMarginTotal += bestNonWinnerScore === null ? 0 : winner.score - bestNonWinnerScore
    })

    losers.forEach((loser) => {
      const stats = statsByPlayerId.get(loser.playerId)
      if (!stats) return

      stats.lossGames += 1
      stats.defeatMarginTotal += bestRecordedWinnerScore - loser.score
    })
  })

  return [...statsByPlayerId.values()].map((player) => ({
    playerId: player.playerId,
    name: player.name,
    tier: player.tier,
    winGames: player.winGames,
    lossGames: player.lossGames,
    averageVictoryMargin:
      player.winGames > 0 ? round1(player.victoryMarginTotal / player.winGames) : null,
    averageDefeatMargin:
      player.lossGames > 0 ? round1(player.defeatMarginTotal / player.lossGames) : null,
  }))
}

export interface PlayerWinRateByGameSize {
  playerId: number
  name: string
  tier: PlayerTierType
  playerCount: number
  games: number
  wins: number
  winRate: number
}

export async function getPlayerWinRateByGameSize(): Promise<PlayerWinRateByGameSize[]> {
  const data = await getGameSizeAggregateData()
  return data.playerWinRateByGameSize
}

export interface TierShowdownStats {
  tier: PlayerTierType
  players: number
  appearances: number
  wins: number
  winRate: number
}

export async function getTierShowdownStats(): Promise<TierShowdownStats[]> {
  const data = await getGameSizeAggregateData()
  return data.tierShowdownStats
}

export interface PlayerExpectedVsActualWins {
  playerId: number
  name: string
  tier: PlayerTierType
  games: number
  wins: number
  expectedWins: number
  winDelta: number
}

export async function getPlayerExpectedVsActualWins(): Promise<PlayerExpectedVsActualWins[]> {
  const data = await getGameSizeAggregateData()
  return data.playerExpectedVsActualWins
}

export interface RecentActivitySummary {
  totalGames: number
  latestPlayedAt: string | null
}

export async function getRecentActivitySummary(): Promise<RecentActivitySummary> {
  const [latestGame] = await db
    .select({
      playedAt: games.playedAt,
    })
    .from(games)
    .orderBy(desc(games.playedAt), desc(games.id))
    .limit(1)

  const [{ totalGames }] = await db
    .select({
      totalGames: count(),
    })
    .from(games)

  if (!latestGame) {
    return {
      totalGames,
      latestPlayedAt: null,
    }
  }

  return {
    totalGames,
    latestPlayedAt: latestGame.playedAt.toISOString(),
  }
}

interface GameOutcomeRow {
  gameId: number
  playedAt: Date
  playerId: number
  name: string
  tier: PlayerTierType
  isWinner: boolean
}

interface OrderedGameOutcomeData {
  players: PlayerIdentity[]
  outcomeRows: GameOutcomeRow[]
}

async function getOrderedGameOutcomeData(): Promise<OrderedGameOutcomeData> {
  const [playerRows, outcomeRows] = await Promise.all([
    db
      .select({
        playerId: players.id,
        name: players.name,
        tier: players.tier,
      })
      .from(players)
      .orderBy(players.name),
    db
      .select({
        gameId: games.id,
        playedAt: games.playedAt,
        playerId: players.id,
        name: players.name,
        tier: players.tier,
        isWinner: gamePlayers.isWinner,
      })
      .from(gamePlayers)
      .innerJoin(games, eq(games.id, gamePlayers.gameId))
      .innerJoin(players, eq(players.id, gamePlayers.playerId))
      .orderBy(desc(games.playedAt), desc(games.id), players.name),
  ])

  return {
    players: playerRows.map((player) => ({
      playerId: player.playerId,
      name: player.name,
      tier: parsePlayerTier(player.tier),
    })),
    outcomeRows: outcomeRows.map((row) => ({
      gameId: row.gameId,
      playedAt: row.playedAt,
      playerId: row.playerId,
      name: row.name,
      tier: parsePlayerTier(row.tier),
      isWinner: row.isWinner,
    })),
  }
}

export interface ReigningChampionSummary {
  playedAt: string
  winners: PlayerIdentity[]
}

export async function getReigningChampionSummary(): Promise<ReigningChampionSummary | null> {
  const { outcomeRows } = await getOrderedGameOutcomeData()
  const latestGame = outcomeRows[0]

  if (!latestGame) {
    return null
  }

  return {
    playedAt: latestGame.playedAt.toISOString(),
    winners: outcomeRows
      .filter((row) => row.gameId === latestGame.gameId && row.isWinner)
      .map((row) => ({
        playerId: row.playerId,
        name: row.name,
        tier: row.tier,
      })),
  }
}

export interface PlayerCurrentWinStreak extends PlayerIdentity {
  streak: number
  mostRecentWin: string | null
}

function compareNullableIsoDesc(left: string | null, right: string | null) {
  if (left === right) {
    return 0
  }

  if (left === null) {
    return 1
  }

  if (right === null) {
    return -1
  }

  return right.localeCompare(left)
}

export async function getPlayerCurrentWinStreaks(): Promise<PlayerCurrentWinStreak[]> {
  const { players: allPlayers, outcomeRows } = await getOrderedGameOutcomeData()
  const rowsByPlayerId = new Map<number, GameOutcomeRow[]>()
  const mostRecentWinByPlayerId = new Map<number, string | null>(
    allPlayers.map((player) => [player.playerId, null]),
  )

  outcomeRows.forEach((row) => {
    const existingRows = rowsByPlayerId.get(row.playerId) ?? []
    existingRows.push(row)
    rowsByPlayerId.set(row.playerId, existingRows)

    if (row.isWinner && mostRecentWinByPlayerId.get(row.playerId) === null) {
      mostRecentWinByPlayerId.set(row.playerId, row.playedAt.toISOString())
    }
  })

  return allPlayers
    .map((player) => {
      const rows = rowsByPlayerId.get(player.playerId) ?? []
      let streak = 0

      rows.some((row) => {
        if (!row.isWinner) {
          return true
        }

        streak += 1
        return false
      })

      return {
        ...player,
        streak,
        mostRecentWin: mostRecentWinByPlayerId.get(player.playerId) ?? null,
      }
    })
    .sort(
      (a, b) => b.streak - a.streak
        || compareNullableIsoDesc(a.mostRecentWin, b.mostRecentWin)
        || a.name.localeCompare(b.name),
    )
}

export interface PlayerWinEvent extends PlayerIdentity {
  playedAt: string
}

export async function getPlayerWinEvents(): Promise<PlayerWinEvent[]> {
  const { outcomeRows } = await getOrderedGameOutcomeData()

  return outcomeRows
    .filter((row) => row.isWinner)
    .map((row) => ({
      playedAt: row.playedAt.toISOString(),
      playerId: row.playerId,
      name: row.name,
      tier: row.tier,
    }))
}

async function getOrderedGameDates(): Promise<Date[]> {
  const gameRows = await db
    .select({
      playedAt: games.playedAt,
    })
    .from(games)
    .orderBy(games.playedAt, games.id)

  return gameRows.map((game) => game.playedAt)
}

export async function getGameActivityTimestamps(): Promise<string[]> {
  const playedAtDates = await getOrderedGameDates()
  return playedAtDates.map((playedAt) => playedAt.toISOString())
}

export interface ActivityBucket {
  bucketStart: Date
  label: string
  gameCount: number
}

export interface GamesOverTimeSeries {
  weekly: ActivityBucket[]
  monthly: ActivityBucket[]
  totalGames: number
}

function buildBucketStarts(
  playedAtDates: Date[],
  getBucketStart: (date: Date) => Date,
  getNextBucketStart: (date: Date) => Date,
): Date[] {
  if (playedAtDates.length === 0) {
    return []
  }

  const firstBucket = getBucketStart(playedAtDates[0])
  const lastBucket = getBucketStart(playedAtDates[playedAtDates.length - 1])
  const bucketStarts: Date[] = []

  for (
    let bucketStart = firstBucket;
    bucketStart.getTime() <= lastBucket.getTime();
    bucketStart = getNextBucketStart(bucketStart)
  ) {
    bucketStarts.push(bucketStart)
  }

  return bucketStarts
}

function buildActivityBuckets(
  playedAtDates: Date[],
  getBucketStart: (date: Date) => Date,
  getNextBucketStart: (date: Date) => Date,
  formatLabel: (date: Date) => string,
): ActivityBucket[] {
  if (playedAtDates.length === 0) {
    return []
  }

  const countsByBucket = new Map<string, number>()

  playedAtDates.forEach((playedAt) => {
    const bucketStart = getBucketStart(playedAt)
    const bucketKey = toUtcDateKey(bucketStart)
    countsByBucket.set(bucketKey, (countsByBucket.get(bucketKey) ?? 0) + 1)
  })

  return buildBucketStarts(playedAtDates, getBucketStart, getNextBucketStart).map((bucketStart) => {
    const bucketKey = toUtcDateKey(bucketStart)

    return {
      bucketStart,
      label: formatLabel(bucketStart),
      gameCount: countsByBucket.get(bucketKey) ?? 0,
    }
  })
}

export async function getGamesOverTimeSeries(): Promise<GamesOverTimeSeries> {
  const playedAtDates = await getOrderedGameDates()

  return {
    weekly: buildActivityBuckets(
      playedAtDates,
      getIsoWeekStart,
      (date) => addUtcDays(date, 7),
      formatShortUtcDate,
    ),
    monthly: buildActivityBuckets(
      playedAtDates,
      getUtcMonthStart,
      (date) => addUtcMonths(date, 1),
      formatShortUtcMonth,
    ),
    totalGames: playedAtDates.length,
  }
}

interface PlayerActivityRow {
  playedAt: Date
  playerId: number
  name: string
  tier: PlayerTierType
}

export interface PlayerAttendanceSegment {
  playerId: number
  name: string
  tier: PlayerTierType
  gameCount: number
}

export interface PlayerAttendanceBucket {
  bucketStart: Date
  label: string
  totalAppearances: number
  segments: PlayerAttendanceSegment[]
}

export interface PlayerAttendanceSeries {
  weekly: PlayerAttendanceBucket[]
  monthly: PlayerAttendanceBucket[]
}

export interface PlayerAttendanceEvent {
  playedAt: string
  playerId: number
  name: string
  tier: PlayerTierType
}

function buildPlayerAttendanceBuckets(
  rows: PlayerActivityRow[],
  playedAtDates: Date[],
  getBucketStart: (date: Date) => Date,
  getNextBucketStart: (date: Date) => Date,
  formatLabel: (date: Date) => string,
): PlayerAttendanceBucket[] {
  if (rows.length === 0) {
    return []
  }

  const segmentsByBucket = new Map<string, Map<number, PlayerAttendanceSegment>>()

  rows.forEach((row) => {
    const bucketStart = getBucketStart(row.playedAt)
    const bucketKey = toUtcDateKey(bucketStart)
    const bucketSegments = segmentsByBucket.get(bucketKey) ?? new Map<number, PlayerAttendanceSegment>()
    const existing = bucketSegments.get(row.playerId) ?? {
      playerId: row.playerId,
      name: row.name,
      tier: row.tier,
      gameCount: 0,
    }

    existing.gameCount += 1
    bucketSegments.set(row.playerId, existing)
    segmentsByBucket.set(bucketKey, bucketSegments)
  })

  return buildBucketStarts(playedAtDates, getBucketStart, getNextBucketStart).map((bucketStart) => {
    const bucketKey = toUtcDateKey(bucketStart)
    const segments = [...(segmentsByBucket.get(bucketKey)?.values() ?? [])].sort(
      (a, b) => b.gameCount - a.gameCount || a.name.localeCompare(b.name),
    )

    return {
      bucketStart,
      label: formatLabel(bucketStart),
      totalAppearances: segments.reduce((total, segment) => total + segment.gameCount, 0),
      segments,
    }
  })
}

export async function getPlayerAttendanceSeries(): Promise<PlayerAttendanceSeries> {
  const rows = await db
    .select({
      playedAt: games.playedAt,
      playerId: players.id,
      name: players.name,
      tier: players.tier,
    })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .orderBy(games.playedAt, games.id, players.name)

  const attendanceRows = rows.map((row) => ({
    playedAt: row.playedAt,
    playerId: row.playerId,
    name: row.name,
    tier: parsePlayerTier(row.tier),
  }))
  const playedAtDates = attendanceRows.map((row) => row.playedAt)

  return {
    weekly: buildPlayerAttendanceBuckets(
      attendanceRows,
      playedAtDates,
      getIsoWeekStart,
      (date) => addUtcDays(date, 7),
      formatShortUtcDate,
    ),
    monthly: buildPlayerAttendanceBuckets(
      attendanceRows,
      playedAtDates,
      getUtcMonthStart,
      (date) => addUtcMonths(date, 1),
      formatShortUtcMonth,
    ),
  }
}

export async function getPlayerAttendanceEvents(): Promise<PlayerAttendanceEvent[]> {
  const rows = await db
    .select({
      playedAt: games.playedAt,
      playerId: players.id,
      name: players.name,
      tier: players.tier,
    })
    .from(gamePlayers)
    .innerJoin(games, eq(games.id, gamePlayers.gameId))
    .innerJoin(players, eq(players.id, gamePlayers.playerId))
    .orderBy(games.playedAt, games.id, players.name)

  return rows.map((row) => ({
    playedAt: row.playedAt.toISOString(),
    playerId: row.playerId,
    name: row.name,
    tier: parsePlayerTier(row.tier),
  }))
}

export interface CalendarHeatmapDay {
  date: Date
  label: string
  gameCount: number
}

export interface CalendarHeatmapYear {
  year: number
  days: CalendarHeatmapDay[]
  totalGames: number
}

export interface CalendarHeatmapData {
  recentDays: CalendarHeatmapDay[]
  recentRangeLabel: string | null
  years: CalendarHeatmapYear[]
  defaultYear: number | null
}

function buildUtcDateRange(start: Date, end: Date): Date[] {
  const days: Date[] = []

  for (
    let current = startOfUtcDay(start);
    current.getTime() <= startOfUtcDay(end).getTime();
    current = addUtcDays(current, 1)
  ) {
    days.push(current)
  }

  return days
}

function buildCalendarHeatmapDays(
  start: Date,
  end: Date,
  countsByDay: Map<string, number>,
): CalendarHeatmapDay[] {
  return buildUtcDateRange(start, end).map((date) => {
    const dateKey = toUtcDateKey(date)

    return {
      date,
      label: formatLongUtcDate(date),
      gameCount: countsByDay.get(dateKey) ?? 0,
    }
  })
}

export async function getCalendarHeatmapData(): Promise<CalendarHeatmapData> {
  const playedAtDates = await getOrderedGameDates()

  if (playedAtDates.length === 0) {
    return {
      recentDays: [],
      recentRangeLabel: null,
      years: [],
      defaultYear: null,
    }
  }

  const countsByDay = new Map<string, number>()

  playedAtDates.forEach((playedAt) => {
    const day = startOfUtcDay(playedAt)
    const dayKey = toUtcDateKey(day)
    countsByDay.set(dayKey, (countsByDay.get(dayKey) ?? 0) + 1)
  })

  const latestDay = startOfUtcDay(playedAtDates[playedAtDates.length - 1])
  const recentStart = addUtcDays(
    new Date(
      Date.UTC(latestDay.getUTCFullYear() - 1, latestDay.getUTCMonth(), latestDay.getUTCDate()),
    ),
    1,
  )
  const firstRecordedYear = playedAtDates[0].getUTCFullYear()
  const lastRecordedYear = latestDay.getUTCFullYear()
  const years: CalendarHeatmapYear[] = []

  for (let year = lastRecordedYear; year >= firstRecordedYear; year -= 1) {
    const start = new Date(Date.UTC(year, 0, 1))
    const end = new Date(Date.UTC(year, 11, 31))
    const days = buildCalendarHeatmapDays(start, end, countsByDay)
    const totalGames = days.reduce((total, day) => total + day.gameCount, 0)

    if (totalGames > 0) {
      years.push({
        year,
        days,
        totalGames,
      })
    }
  }

  return {
    recentDays: buildCalendarHeatmapDays(recentStart, latestDay, countsByDay),
    recentRangeLabel: `${formatLongUtcDate(recentStart)} - ${formatLongUtcDate(latestDay)}`,
    years,
    defaultYear: lastRecordedYear,
  }
}

export interface PlayerParticipationRate {
  playerId: number
  name: string
  tier: PlayerTierType
  gamesPlayed: number
  totalGames: number
  participationRate: number
}

export async function getPlayerParticipationRates(): Promise<PlayerParticipationRate[]> {
  const [rows, [{ totalGames }]] = await Promise.all([
    db
      .select({
        playerId: players.id,
        name: players.name,
        tier: players.tier,
        gamesPlayed: count(gamePlayers.id),
      })
      .from(players)
      .leftJoin(gamePlayers, eq(gamePlayers.playerId, players.id))
      .groupBy(players.id)
      .orderBy(players.name),
    db
      .select({
        totalGames: count(),
      })
      .from(games),
  ])

  return rows
    .map((row) => ({
      playerId: row.playerId,
      name: row.name,
      tier: parsePlayerTier(row.tier),
      gamesPlayed: row.gamesPlayed,
      totalGames,
      participationRate: totalGames > 0 ? row.gamesPlayed / totalGames : 0,
    }))
    .sort((a, b) => b.participationRate - a.participationRate || a.name.localeCompare(b.name))
}
