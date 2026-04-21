// Stats query functions are appended by feature agents.

import { count, eq, sql } from 'drizzle-orm'
import { gamePlayers, players } from '@/db/schema'
import { parsePlayerTier, PlayerTier, type PlayerTier as PlayerTierType } from '@/lib/player-tier'
import { db } from './db'

function round1(value: number): number {
  return Math.round(value * 10) / 10
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

  const tierStats = new Map<PlayerTier, TierShowdownAccumulator>([
    [PlayerTier.Premium, {
      tier: PlayerTier.Premium,
      players: playerRows.filter((player) => parsePlayerTier(player.tier) === PlayerTier.Premium).length,
      appearances: 0,
      wins: 0,
    }],
    [PlayerTier.Standard, {
      tier: PlayerTier.Standard,
      players: playerRows.filter((player) => parsePlayerTier(player.tier) === PlayerTier.Standard).length,
      appearances: 0,
      wins: 0,
    }],
  ])

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

      const tier = tierStats.get(player.tier)
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
    tierShowdownStats: [...tierStats.values()]
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
      const games = row.games as number
      const podiums = row.podiums as number
      return {
        playerId: row.playerId as number,
        name: row.name as string,
        tier: parsePlayerTier(row.tier as string),
        games,
        podiums,
        podiumRate: games > 0 ? podiums / games : 0,
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
      const games = row.games as number
      const firsts = row.firsts as number
      const seconds = row.seconds as number
      const thirds = row.thirds as number
      const lasts = row.lasts as number

      return {
        playerId: row.playerId as number,
        name: row.name as string,
        tier: parsePlayerTier(row.tier as string),
        games,
        firsts,
        seconds,
        thirds,
        lasts,
        firstRate: games > 0 ? firsts / games : 0,
        secondRate: games > 0 ? seconds / games : 0,
        thirdRate: games > 0 ? thirds / games : 0,
        lastRate: games > 0 ? lasts / games : 0,
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
