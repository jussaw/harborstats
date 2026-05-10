import { beforeEach, describe, expect, test, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { loginAction } from '@/app/admin/actions';
import { updateGameAction, deleteGameAction } from '@/app/admin/games/actions';
import {
  createPlayerAction,
  updatePlayerAction,
  deletePlayerAction,
} from '@/app/admin/players/actions';
import { saveSettings } from '@/app/admin/settings/actions';
import { COOKIE_NAME as ADMIN_COOKIE_NAME, signSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { gamePlayers, games, players } from '@/db/schema';
import { getSettings, updateRateMinGames } from '@/lib/settings';
import { PlayerTier } from '@/lib/player-tier';
import * as playersLib from '@/lib/players';
import { createTestGame, createTestPlayer } from '../helpers/db';

const mocked = vi.hoisted(() => {
  class RedirectSignal extends Error {
    constructor(readonly path: string) {
      super(`redirect:${path}`);
      this.name = 'RedirectSignal';
    }
  }

  return {
    RedirectSignal,
    redirectMock: vi.fn((path: string) => {
      throw new RedirectSignal(path);
    }),
    revalidatePathMock: vi.fn(),
    cookiesMock: vi.fn(),
  };
});

vi.mock('next/navigation', () => ({
  redirect: mocked.redirectMock,
}));

vi.mock('next/cache', () => ({
  revalidatePath: mocked.revalidatePathMock,
}));

vi.mock('next/headers', () => ({
  cookies: mocked.cookiesMock,
}));

function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    formData.set(key, value);
  });
  return formData;
}

async function setupValidAdminSession() {
  vi.stubEnv('ADMIN_SESSION_SECRET', 'test-secret');
  const sessionCookie = await signSession();
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn((name: string) =>
      name === ADMIN_COOKIE_NAME ? { value: sessionCookie } : undefined,
    ),
  } as Awaited<ReturnType<typeof cookies>>);
}

function setupMissingAdminSession() {
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn(() => undefined),
  } as Awaited<ReturnType<typeof cookies>>);
}

describe('admin login action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ADMIN_PASSWORD', 'correct-password');
    vi.stubEnv('ADMIN_SESSION_SECRET', 'test-secret');
    vi.mocked(cookies).mockResolvedValue({
      set: vi.fn(),
    } as unknown as Awaited<ReturnType<typeof cookies>>);
  });

  test('redirects to valid admin-relative next paths after login', async () => {
    await expect(
      loginAction(buildFormData({ password: 'correct-password', next: '/admin/games' })),
    ).rejects.toMatchObject({
      path: '/admin/games',
    });
  });

  test.each(['https://evil.test/admin', '//evil.test/admin', '/games', '', 'admin/games'])(
    'falls back to /admin for hostile or invalid next value %j',
    async (next) => {
      await expect(
        loginAction(buildFormData({ password: 'correct-password', next })),
      ).rejects.toMatchObject({
        path: '/admin',
      });
    },
  );
});

describe('admin game actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('updateGameAction throws when no valid admin session cookie is present', async () => {
    setupMissingAdminSession();

    const formData = new FormData();
    await expect(updateGameAction(formData)).rejects.toThrow('Admin authentication required');
  });

  test('updateGameAction updates the stored game from real form parsing before redirecting', async () => {
    await setupValidAdminSession();
    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });
    const game = await createTestGame({
      notes: 'Original',
      players: [
        { playerId: alice.id, score: 6, isWinner: true },
        { playerId: bob.id, score: 5, isWinner: false },
      ],
    });

    const formData = new FormData();
    formData.set('game_id', String(game.id));
    formData.set('played_at', '2026-01-03T12:00:00.000Z');
    formData.set('notes', 'Updated game');
    formData.set('player_id_0', String(alice.id));
    formData.set('score_0', '4');
    formData.set('player_id_1', String(bob.id));
    formData.set('score_1', '11');

    await expect(updateGameAction(formData)).rejects.toMatchObject({
      path: '/admin/games',
    });

    const [storedGame] = await db.select().from(games).where(eq(games.id, game.id));
    expect(storedGame).toMatchObject({
      notes: 'Updated game',
    });
    expect(storedGame.playedAt.toISOString()).toBe('2026-01-03T12:00:00.000Z');

    const storedPlayers = await db
      .select()
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, game.id));

    expect(storedPlayers).toHaveLength(2);
    expect(storedPlayers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: alice.id,
          score: 4,
          isWinner: false,
        }),
        expect.objectContaining({
          playerId: bob.id,
          score: 11,
          isWinner: true,
        }),
      ]),
    );
    expect(mocked.redirectMock).toHaveBeenCalledWith('/admin/games');
  });

  test('deleteGameAction removes the stored game and its rows before redirecting', async () => {
    await setupValidAdminSession();
    const alice = await createTestPlayer({ name: 'Alice' });
    const game = await createTestGame({
      players: [{ playerId: alice.id, score: 10, isWinner: true }],
    });

    const formData = new FormData();
    formData.set('game_id', String(game.id));

    await expect(deleteGameAction(formData)).rejects.toMatchObject({
      path: '/admin/games',
    });

    const remainingGames = await db.select().from(games).where(eq(games.id, game.id));
    const remainingPlayers = await db
      .select()
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, game.id));

    expect(remainingGames).toHaveLength(0);
    expect(remainingPlayers).toHaveLength(0);
    expect(mocked.redirectMock).toHaveBeenCalledWith('/admin/games');
  });
});

describe('admin player actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('createPlayerAction throws when no valid admin session cookie is present', async () => {
    setupMissingAdminSession();

    await expect(createPlayerAction(buildFormData({ name: 'Alice' }))).rejects.toThrow(
      'Admin authentication required',
    );
    expect(await db.select().from(players)).toHaveLength(0);
  });

  test('createPlayerAction redirects with an error when the name is blank and does not create a player', async () => {
    await setupValidAdminSession();
    const formData = new FormData();
    formData.set('name', '   ');
    formData.set('tier', PlayerTier.Premium);

    await expect(createPlayerAction(formData)).rejects.toMatchObject({
      path: '/admin/players?error=name-required',
    });

    expect(await db.select().from(players)).toHaveLength(0);
  });

  test('createPlayerAction trims the name, persists the parsed tier, and redirects', async () => {
    await setupValidAdminSession();
    const formData = new FormData();
    formData.set('name', '  Alice  ');
    formData.set('tier', PlayerTier.Premium);

    await expect(createPlayerAction(formData)).rejects.toMatchObject({
      path: '/admin/players',
    });

    const storedPlayers = await db.select().from(players);
    expect(storedPlayers).toHaveLength(1);
    expect(storedPlayers[0]).toMatchObject({
      name: 'Alice',
      tier: PlayerTier.Premium,
    });
  });

  test('updatePlayerAction redirects with an error when the name is blank and leaves the player unchanged', async () => {
    await setupValidAdminSession();
    const player = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });

    const formData = new FormData();
    formData.set('id', String(player.id));
    formData.set('name', '');
    formData.set('tier', PlayerTier.Premium);

    await expect(updatePlayerAction(formData)).rejects.toMatchObject({
      path: '/admin/players?error=name-required',
    });

    const [storedPlayer] = await db.select().from(players).where(eq(players.id, player.id));
    expect(storedPlayer).toMatchObject({
      name: 'Bob',
      tier: PlayerTier.Standard,
    });
  });

  test('updatePlayerAction updates the stored player using trimmed names and parsed tiers', async () => {
    await setupValidAdminSession();
    const player = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Premium });

    const formData = new FormData();
    formData.set('id', String(player.id));
    formData.set('name', '  Bobby  ');
    formData.set('tier', 'unexpected-value');

    await expect(updatePlayerAction(formData)).rejects.toMatchObject({
      path: '/admin/players',
    });

    const [storedPlayer] = await db.select().from(players).where(eq(players.id, player.id));
    expect(storedPlayer).toMatchObject({
      name: 'Bobby',
      tier: PlayerTier.Standard,
    });
  });

  test('deletePlayerAction redirects with the real usage count when the player is still referenced', async () => {
    await setupValidAdminSession();
    const player = await createTestPlayer({ name: 'Alice' });
    await createTestGame({
      players: [{ playerId: player.id, score: 10, isWinner: true }],
    });
    await createTestGame({
      players: [{ playerId: player.id, score: 7, isWinner: true }],
    });

    const formData = new FormData();
    formData.set('id', String(player.id));

    await expect(deletePlayerAction(formData)).rejects.toMatchObject({
      path: '/admin/players?error=player-in-use&count=2',
    });

    const remainingPlayers = await db.select().from(players).where(eq(players.id, player.id));
    expect(remainingPlayers).toHaveLength(1);
  });

  test('deletePlayerAction rethrows unexpected errors', async () => {
    await setupValidAdminSession();
    const failure = new Error('database offline');
    const deletePlayerSpy = vi.spyOn(playersLib, 'deletePlayer').mockRejectedValueOnce(failure);

    const formData = new FormData();
    formData.set('id', '12');

    await expect(deletePlayerAction(formData)).rejects.toBe(failure);

    deletePlayerSpy.mockRestore();
  });
});

describe('admin settings action', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('saveSettings throws when no valid admin session cookie is present', async () => {
    await updateRateMinGames({ winRateMinGames: 5, podiumRateMinGames: 5 });
    setupMissingAdminSession();

    await expect(saveSettings(new FormData())).rejects.toThrow('Admin authentication required');
    expect(await getSettings()).toEqual({ winRateMinGames: 5, podiumRateMinGames: 5 });
  });

  test('saveSettings clamps negative values to zero, persists them, and revalidates stats pages', async () => {
    await setupValidAdminSession();
    const formData = new FormData();
    formData.set('win_rate_min_games', '-4');
    formData.set('podium_rate_min_games', '-9');

    await saveSettings(formData);

    expect(await getSettings()).toEqual({ winRateMinGames: 0, podiumRateMinGames: 0 });
    expect(mocked.revalidatePathMock).toHaveBeenCalledWith('/stats');
    expect(mocked.revalidatePathMock).toHaveBeenCalledWith('/admin/settings');
  });

  test('saveSettings persists positive values independently', async () => {
    await setupValidAdminSession();
    const formData = new FormData();
    formData.set('win_rate_min_games', '12');
    formData.set('podium_rate_min_games', '7');

    await saveSettings(formData);

    expect(await getSettings()).toEqual({ winRateMinGames: 12, podiumRateMinGames: 7 });
  });
});
