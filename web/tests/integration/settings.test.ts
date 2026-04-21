import { describe, expect, test } from 'vitest';
import { db } from '@/lib/db';
import { appSettings } from '@/db/schema';
import { getSettings, updateRateMinGames } from '@/lib/settings';

describe('settings integration', () => {
  test('getSettings returns defaults when no settings row exists', async () => {
    await expect(getSettings()).resolves.toEqual({ winRateMinGames: 0, podiumRateMinGames: 0 });
  });

  test('updateRateMinGames upserts a single row and updates both stored values independently', async () => {
    await updateRateMinGames({ winRateMinGames: 3, podiumRateMinGames: 5 });

    expect(await getSettings()).toEqual({ winRateMinGames: 3, podiumRateMinGames: 5 });

    await updateRateMinGames({ winRateMinGames: 8, podiumRateMinGames: 2 });

    expect(await getSettings()).toEqual({ winRateMinGames: 8, podiumRateMinGames: 2 });

    const rows = await db.select().from(appSettings);
    expect(rows).toHaveLength(1);
    expect(rows[0].winRateMinGames).toBe(8);
    expect(rows[0].podiumRateMinGames).toBe(2);
  });
});
