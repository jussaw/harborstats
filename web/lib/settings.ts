import { eq } from 'drizzle-orm';
import { appSettings } from '@/db/schema';
import { db } from './db';

export interface AppSettings {
  winRateMinGames: number;
  podiumRateMinGames: number;
}

export async function getSettings(): Promise<AppSettings> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.id, 1));
  if (rows.length === 0) return { winRateMinGames: 0, podiumRateMinGames: 0 };
  return {
    winRateMinGames: rows[0].winRateMinGames,
    podiumRateMinGames: rows[0].podiumRateMinGames,
  };
}

interface RateMinGamesInput {
  winRateMinGames: number;
  podiumRateMinGames: number;
}

export async function updateRateMinGames({
  winRateMinGames,
  podiumRateMinGames,
}: RateMinGamesInput): Promise<void> {
  await db
    .insert(appSettings)
    .values({ id: 1, winRateMinGames, podiumRateMinGames })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { winRateMinGames, podiumRateMinGames, updatedAt: new Date() },
    });
}
