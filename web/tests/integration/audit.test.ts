import { beforeEach, describe, expect, test, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { loginAction } from '@/app/admin/actions';
import { unlockGameCreationAction } from '@/app/actions/game-unlock';
import { updateGameAction, deleteGameAction } from '@/app/admin/games/actions';
import { createPlayerAction } from '@/app/admin/players/actions';
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

    const [entry] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'game.update'));
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

    const [entry] = await db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.action, 'game.delete'));
    expect(entry).toMatchObject({
      action: 'game.delete',
      actorType: 'admin',
      entityType: 'game',
      entityId: String(game.id),
    });
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
