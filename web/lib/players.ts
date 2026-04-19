import { eq, sql, count } from 'drizzle-orm'
import type { InferSelectModel } from 'drizzle-orm'
import { players, gamePlayers } from '@/db/schema'
import { db } from './db'

export type Player = InferSelectModel<typeof players>

export async function getPlayers(): Promise<Player[]> {
  return db
    .select()
    .from(players)
    .orderBy(sql`CASE ${players.tier} WHEN 'premium' THEN 0 ELSE 1 END`, players.name)
}

export async function getPlayerById(id: number): Promise<Player | null> {
  const result = await db.select().from(players).where(eq(players.id, id)).limit(1)
  return result[0] ?? null
}

export type PlayerWithUsage = Player & { gameCount: number }

export async function listPlayersWithUsage(): Promise<PlayerWithUsage[]> {
  return db
    .select({
      id: players.id,
      name: players.name,
      tier: players.tier,
      createdAt: players.createdAt,
      gameCount: count(gamePlayers.id),
    })
    .from(players)
    .leftJoin(gamePlayers, eq(gamePlayers.playerId, players.id))
    .groupBy(players.id)
    .orderBy(sql`CASE ${players.tier} WHEN 'premium' THEN 0 ELSE 1 END`, players.name)
}

export async function createPlayer(name: string, tier: string): Promise<void> {
  await db.insert(players).values({ name, tier })
}

export async function renamePlayer(id: number, name: string): Promise<void> {
  await db.update(players).set({ name }).where(eq(players.id, id))
}

export async function updatePlayerTier(id: number, tier: string): Promise<void> {
  await db.update(players).set({ tier }).where(eq(players.id, id))
}

export class PlayerInUseError extends Error {
  constructor(public readonly gameCount: number) {
    super(`Player is referenced in ${gameCount} game(s) and cannot be deleted`)
    this.name = 'PlayerInUseError'
  }
}

export async function deletePlayer(id: number): Promise<void> {
  const [{ total }] = await db
    .select({ total: count() })
    .from(gamePlayers)
    .where(eq(gamePlayers.playerId, id))
  if (total > 0) throw new PlayerInUseError(total)
  await db.delete(players).where(eq(players.id, id))
}
