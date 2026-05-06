import { describe, expect, test } from 'vitest';
import { db } from '@/lib/db';
import { appSettings } from '@/db/schema';
import {
  getSettings,
  updateRateMinGames,
  getNewGamePasswordHash,
  setNewGamePassword,
  hasNewGamePassword,
  InvalidPasswordError,
} from '@/lib/settings';

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

  test('hasNewGamePassword returns false initially when no hash is set', async () => {
    await expect(hasNewGamePassword()).resolves.toBe(false);
  });

  test('setNewGamePassword stores a hash that is not the plaintext and getNewGamePasswordHash returns it', async () => {
    const plain = 'test-password';
    await setNewGamePassword(plain);

    const hash = await getNewGamePasswordHash();
    expect(hash).not.toBeNull();
    expect(hash).not.toBe(plain);
    expect(hash).toMatch(/^scrypt\$/);
  });

  test('hasNewGamePassword returns true after setting a password', async () => {
    await setNewGamePassword('some-pass');
    await expect(hasNewGamePassword()).resolves.toBe(true);
  });

  test('setNewGamePassword throws InvalidPasswordError for short input', async () => {
    await expect(setNewGamePassword('ab')).rejects.toThrow(InvalidPasswordError);
    await expect(setNewGamePassword('ab')).rejects.toThrow('at least 4 characters');
  });

  test('setNewGamePassword throws InvalidPasswordError for empty input', async () => {
    await expect(setNewGamePassword('')).rejects.toThrow(InvalidPasswordError);
  });

  test('setNewGamePassword throws InvalidPasswordError for whitespace-only input', async () => {
    await expect(setNewGamePassword('   ')).rejects.toThrow(InvalidPasswordError);
  });
});
