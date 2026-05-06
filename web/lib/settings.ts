import { eq } from 'drizzle-orm';
import { hashPassword } from '@/lib/password-hash';
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

export async function getNewGamePasswordHash(): Promise<string | null> {
  const rows = await db.select().from(appSettings).where(eq(appSettings.id, 1));
  if (rows.length === 0) return null;
  return rows[0].newGamePasswordHash ?? null;
}

export class InvalidPasswordError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPasswordError';
  }
}

export async function setNewGamePassword(plain: string): Promise<void> {
  const trimmed = plain.trim();
  if (trimmed.length < 4) {
    throw new InvalidPasswordError('Password must be at least 4 characters');
  }
  const hash = await hashPassword(trimmed);
  await db
    .insert(appSettings)
    .values({ id: 1, newGamePasswordHash: hash })
    .onConflictDoUpdate({
      target: appSettings.id,
      set: { newGamePasswordHash: hash, updatedAt: new Date() },
    });
}

export async function hasNewGamePassword(): Promise<boolean> {
  const hash = await getNewGamePasswordHash();
  return hash !== null;
}
