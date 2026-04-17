import { db } from './db'

export type Player = { id: number; name: string; tier: string }

export async function getPlayers(): Promise<Player[]> {
  const rows = await db<Player[]>`
    SELECT id, name, tier FROM players
    ORDER BY
      CASE tier WHEN 'premium' THEN 0 ELSE 1 END,
      name ASC
  `
  return rows
}
