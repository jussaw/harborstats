import { beforeEach, describe, expect, test, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { loginAction } from '@/app/admin/actions';
import { unlockGameCreationAction } from '@/app/actions/game-unlock';
import { updateGameAction, deleteGameAction } from '@/app/admin/games/actions';
import { createPlayerAction, updatePlayerAction } from '@/app/admin/players/actions';
import { saveSettings } from '@/app/admin/settings/actions';
import { COOKIE_NAME as ADMIN_COOKIE_NAME, signSession } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import { auditLogs } from '@/db/schema';
import { PlayerTier } from '@/lib/player-tier';
import { createTestGame, createTestPlayer } from '../helpers/db';

const TEST_IP = '203.0.113.7';

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
    // recordAudit (and rate limiting) read headers(); supply a forwarded IP so
    // the audit row's actor_ip is populated.
    headersMock: vi.fn(async () => new Headers({ 'x-forwarded-for': '203.0.113.7' })),
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
  headers: mocked.headersMock,
}));

async function setupValidAdminSession() {
  vi.stubEnv('ADMIN_SESSION_SECRET', 'test-secret');
  const sessionCookie = await signSession();
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn((name: string) =>
      name === ADMIN_COOKIE_NAME ? { value: sessionCookie } : undefined,
    ),
  } as Awaited<ReturnType<typeof cookies>>);
}

describe('audit recording', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await setupValidAdminSession();
  });

  test('createPlayerAction records a player.create entry with the actor IP', async () => {
    const formData = new FormData();
    formData.set('name', 'Ada');
    formData.set('tier', PlayerTier.Premium);

    await expect(createPlayerAction(formData)).rejects.toMatchObject({ path: '/admin/players' });

    const [entry] = await db.select().from(auditLogs);
    expect(entry).toMatchObject({
      action: 'player.create',
      actorType: 'admin',
      actorIp: TEST_IP,
      entityType: 'player',
    });
    expect(entry.summary).toContain('Ada');
    expect(Number(entry.entityId)).toBeGreaterThan(0);
  });

  test('updatePlayerAction records exactly one player.update entry for a real update', async () => {
    const player = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });

    const formData = new FormData();
    formData.set('id', String(player.id));
    formData.set('name', 'Bobby');
    formData.set('tier', PlayerTier.Premium);

    await expect(updatePlayerAction(formData)).rejects.toMatchObject({ path: '/admin/players' });

    const entries = await db.select().from(auditLogs).where(eq(auditLogs.action, 'player.update'));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: 'player.update',
      actorType: 'admin',
      actorIp: TEST_IP,
      entityType: 'player',
      entityId: String(player.id),
    });
    expect(entries[0].metadata).toMatchObject({ name: 'Bobby', tier: PlayerTier.Premium });
  });

  test('updatePlayerAction records no player.update entry for a stale or malformed id', async () => {
    await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });

    const staleForm = new FormData();
    staleForm.set('id', '9999');
    staleForm.set('name', 'Bobby');
    staleForm.set('tier', PlayerTier.Premium);
    await expect(updatePlayerAction(staleForm)).rejects.toMatchObject({ path: '/admin/players' });

    const malformedForm = new FormData();
    malformedForm.set('id', 'not-a-number');
    malformedForm.set('name', 'Bobby');
    malformedForm.set('tier', PlayerTier.Premium);
    await expect(updatePlayerAction(malformedForm)).rejects.toMatchObject({
      path: '/admin/players',
    });

    expect(
      await db.select().from(auditLogs).where(eq(auditLogs.action, 'player.update')),
    ).toHaveLength(0);
  });

  test('updateGameAction records a game.update entry', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const bea = await createTestPlayer({ name: 'Bea' });
    const game = await createTestGame({
      players: [
        { playerId: ada.id, score: 6, isWinner: true },
        { playerId: bea.id, score: 5, isWinner: false },
      ],
    });

    const formData = new FormData();
    formData.set('game_id', String(game.id));
    formData.set('played_at', '2026-01-03T12:00:00.000Z');
    formData.set('notes', 'Updated');
    formData.set('player_id_0', String(ada.id));
    formData.set('score_0', '4');
    formData.set('player_id_1', String(bea.id));
    formData.set('score_1', '11');

    await expect(updateGameAction(formData)).rejects.toMatchObject({ path: '/admin/games' });

    const [entry] = await db.select().from(auditLogs).where(eq(auditLogs.action, 'game.update'));
    expect(entry).toMatchObject({
      action: 'game.update',
      actorType: 'admin',
      actorIp: TEST_IP,
      entityType: 'game',
      entityId: String(game.id),
    });
  });

  test('deleteGameAction records a game.delete entry', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const game = await createTestGame({
      players: [{ playerId: ada.id, score: 10, isWinner: true }],
    });

    const formData = new FormData();
    formData.set('game_id', String(game.id));

    await expect(deleteGameAction(formData)).rejects.toMatchObject({ path: '/admin/games' });

    const entries = await db.select().from(auditLogs).where(eq(auditLogs.action, 'game.delete'));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      action: 'game.delete',
      actorType: 'admin',
      actorIp: TEST_IP,
      entityType: 'game',
      entityId: String(game.id),
    });
  });

  test('deleteGameAction records no game.delete entry for a stale/double delete', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const game = await createTestGame({
      players: [{ playerId: ada.id, score: 10, isWinner: true }],
    });

    const formData = new FormData();
    formData.set('game_id', String(game.id));

    // Real deletion records one event; the repeat delete of the now-gone game
    // must not add a second, falsely-successful, event.
    await expect(deleteGameAction(formData)).rejects.toMatchObject({ path: '/admin/games' });
    await expect(deleteGameAction(formData)).rejects.toMatchObject({ path: '/admin/games' });

    expect(
      await db.select().from(auditLogs).where(eq(auditLogs.action, 'game.delete')),
    ).toHaveLength(1);
  });

  test('deleteGameAction records no game.delete entry for a malformed game id', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    await createTestGame({
      players: [{ playerId: ada.id, score: 10, isWinner: true }],
    });

    const formData = new FormData();
    formData.set('game_id', 'not-a-number');

    await expect(deleteGameAction(formData)).rejects.toMatchObject({ path: '/admin/games' });

    expect(await db.select().from(auditLogs)).toHaveLength(0);
  });

  test('saveSettings records a settings.update entry with the new thresholds', async () => {
    const formData = new FormData();
    formData.set('win_rate_min_games', '12');
    formData.set('podium_rate_min_games', '7');
    formData.set('stat_card_min_games', '9');

    await saveSettings(formData);

    const [entry] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'settings.update'));
    expect(entry).toMatchObject({
      action: 'settings.update',
      actorType: 'admin',
      entityType: 'settings',
    });
    expect(entry.metadata).toMatchObject({
      winRateMinGames: 12,
      podiumRateMinGames: 7,
      statCardMinGames: 9,
    });
  });
});

describe('audit recording for failed auth attempts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ADMIN_PASSWORD', 'correct-password');
    vi.stubEnv('ADMIN_SESSION_SECRET', 'test-secret');
  });

  test('loginAction records an admin.login_failed entry on a wrong password', async () => {
    const formData = new FormData();
    formData.set('password', 'wrong-password');
    formData.set('next', '/admin');

    await expect(loginAction(formData)).rejects.toMatchObject({
      path: '/admin/login?error=1&next=%2Fadmin',
    });

    const [entry] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'admin.login_failed'));
    expect(entry).toMatchObject({
      action: 'admin.login_failed',
      actorType: 'anonymous',
      actorIp: TEST_IP,
      entityType: 'session',
    });
    expect(entry.metadata).toMatchObject({ reason: 'incorrect_password' });
  });

  test('unlockGameCreationAction records a game.unlock_failed entry when no password is configured', async () => {
    const formData = new FormData();
    formData.set('password', 'whatever');

    await expect(unlockGameCreationAction({ ok: false }, formData)).resolves.toEqual({
      ok: false,
      error: 'not-configured',
    });

    const [entry] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'game.unlock_failed'));
    expect(entry).toMatchObject({
      action: 'game.unlock_failed',
      actorType: 'anonymous',
      actorIp: TEST_IP,
      entityType: 'session',
    });
    expect(entry.metadata).toMatchObject({ reason: 'not_configured' });
  });
});
