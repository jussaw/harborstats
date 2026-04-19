import { eq } from 'drizzle-orm'
import { appSettings } from '@/db/schema'
import { db } from './db'

export interface AppSettings {
  winRateMinGames: number
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.id, 1))
  if (rows.length === 0) return { winRateMinGames: 0 }
  return { winRateMinGames: rows[0].winRateMinGames }
}

export async function updateWinRateMinGames(value: number): Promise<void> {
  await db
    .insert(appSettings)
    .values({ id: 1, winRateMinGames: value })
    .onConflictDoUpdate({ target: appSettings.id, set: { winRateMinGames: value, updatedAt: new Date() } })
}
