// Stats query functions are appended by feature agents.

import { count, eq, sql } from 'drizzle-orm'
import { gamePlayers, players } from '@/db/schema'
import { parsePlayerTier, type PlayerTier } from '@/lib/player-tier'
import { db } from './db'

export interface PlayerWinRate {
  playerId: number
  name: string
  tier: PlayerTier
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
  tier: PlayerTier
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

  const round1 = (v: number) => Math.round(v * 10) / 10

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
  tier: PlayerTier
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
