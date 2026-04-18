import { db } from './db'

export interface Player { id: number; name: string; tier: string }

export async function getPlayers(): Promise<Player[]> {
  const rows = await db<Player[]>`
    SELECT id, name, tier FROM players
    ORDER BY
      CASE tier WHEN 'premium' THEN 0 ELSE 1 END,
      name ASC
  `
  return rows
}

export interface PlayerWithUsage extends Player { game_count: number }

export async function listPlayersWithUsage(): Promise<PlayerWithUsage[]> {
  const rows = await db<PlayerWithUsage[]>`
    SELECT p.id, p.name, p.tier, COUNT(gp.id)::int AS game_count
    FROM players p
    LEFT JOIN game_players gp ON gp.player_id = p.id
    GROUP BY p.id, p.name, p.tier
    ORDER BY
      CASE p.tier WHEN 'premium' THEN 0 ELSE 1 END,
      p.name ASC
  `
  return rows
}

export async function createPlayer(name: string, tier: string): Promise<void> {
  await db`INSERT INTO players (name, tier) VALUES (${name}, ${tier})`
}

export async function renamePlayer(id: number, name: string): Promise<void> {
  await db`UPDATE players SET name = ${name} WHERE id = ${id}`
}

export async function updatePlayerTier(id: number, tier: string): Promise<void> {
  await db`UPDATE players SET tier = ${tier} WHERE id = ${id}`
}

export class PlayerInUseError extends Error {
  constructor(public readonly gameCount: number) {
    super(`Player is referenced in ${gameCount} game(s) and cannot be deleted`)
    this.name = 'PlayerInUseError'
  }
}

export async function deletePlayer(id: number): Promise<void> {
  const [row] = await db<{ count: number }[]>`
    SELECT COUNT(*)::int AS count FROM game_players WHERE player_id = ${id}
  `
  if (row.count > 0) throw new PlayerInUseError(row.count)
  await db`DELETE FROM players WHERE id = ${id}`
}
