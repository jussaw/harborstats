import { describe, expect, test } from 'vitest';
import { db } from '@/lib/db';
import { appSettings } from '@/db/schema';
import { getSettings, updateWinRateMinGames } from '@/lib/settings';

describe('settings integration', () => {
  test('getSettings returns defaults when no settings row exists', async () => {
    await expect(getSettings()).resolves.toEqual({ winRateMinGames: 0 });
  });

  test('updateWinRateMinGames upserts a single row and updates the stored value', async () => {
    await updateWinRateMinGames(3);

    expect(await getSettings()).toEqual({ winRateMinGames: 3 });

    await updateWinRateMinGames(8);

    expect(await getSettings()).toEqual({ winRateMinGames: 8 });

    const rows = await db.select().from(appSettings);
    expect(rows).toHaveLength(1);
    expect(rows[0].winRateMinGames).toBe(8);
  });
});
