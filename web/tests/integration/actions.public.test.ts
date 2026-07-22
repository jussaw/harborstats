import { beforeEach, describe, expect, it, test, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { cookies } from 'next/headers';
import { createGameAction } from '@/app/actions';
import { unlockGameCreationAction } from '@/app/actions/game-unlock';
import { signGameSession, COOKIE_NAME } from '@/lib/game-auth';
import { setNewGamePassword } from '@/lib/settings';
import { db } from '@/lib/db';
import { gamePlayers, games } from '@/db/schema';
import { createTestPlayer } from '../helpers/db';

function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    formData.set(key, value);
  });
  return formData;
}

const { headersMock, cookiesMock } = vi.hoisted(() => ({
  // Default implementation survives the configured mockReset between tests,
  // so actions that read headers() work without per-describe setup.
  headersMock: vi.fn(async () => new Headers()),
  cookiesMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: headersMock,
  cookies: cookiesMock,
}));

async function setupValidSession() {
  vi.stubEnv('ADMIN_SESSION_SECRET', 'test-secret');
  // Game sessions are bound to the configured password hash, so one must
  // exist before a session can be signed.
  await setNewGamePassword('session-password');
  const sessionCookie = await signGameSession();
  vi.mocked(cookies).mockResolvedValue({
    get: vi.fn((name: string) =>
      name === COOKIE_NAME ? { value: sessionCookie } : undefined,
    ),
  } as Awaited<ReturnType<typeof cookies>>);
}

describe('createGameAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
  });

  test('returns a locked error when no valid hs_game session cookie is present', async () => {
    cookiesMock.mockResolvedValue({
      get: vi.fn(() => undefined),
    } as Awaited<ReturnType<typeof cookies>>);

    const formData = new FormData();
    await expect(createGameAction(formData)).resolves.toEqual({
      ok: false,
      error: expect.stringContaining('Game creation is locked'),
    });
  });

  test('returns the validation message instead of throwing for invalid form data', async () => {
    await setupValidSession();

    const alice = await createTestPlayer({ name: 'Alice' });

    const formData = new FormData();
    formData.set('played_at', '2026-01-02T12:00:00.000Z');
    formData.set('player_id_0', String(alice.id));
    formData.set('score_0', '99');

    await expect(createGameAction(formData)).resolves.toEqual({
      ok: false,
      error: 'Score must be an integer from 0 to 30.',
    });

    const storedGames = await db.select().from(games);
    expect(storedGames).toHaveLength(0);
  });

  test('parses submitted form data and persists a game using the first forwarded IP', async () => {
    await setupValidSession();

    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });

    headersMock.mockResolvedValue(
      new Headers({
        'x-forwarded-for': ' 203.0.113.10 , 198.51.100.2 ',
        'x-real-ip': '198.51.100.50',
      }),
    );

    const formData = new FormData();
    formData.set('played_at', '2026-01-02T12:00:00.000Z');
    formData.set('notes', 'Final table');
    formData.set('player_id_0', String(alice.id));
    formData.set('score_0', '12');
    formData.set('is_winner_0', '1');
    formData.set('player_id_1', String(bob.id));
    formData.set('score_1', '8');

    await expect(createGameAction(formData)).resolves.toEqual({ ok: true });

    const storedGames = await db.select().from(games);
    expect(storedGames).toHaveLength(1);
    expect(storedGames[0]).toMatchObject({
      notes: 'Final table',
      submittedFromIp: '203.0.113.10',
    });

    const storedPlayers = await db
      .select()
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, storedGames[0].id));

    expect(storedPlayers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: alice.id,
          score: 12,
          isWinner: true,
        }),
        expect.objectContaining({
          playerId: bob.id,
          score: 8,
          isWinner: false,
        }),
      ]),
    );
  });

  test('falls back to x-real-ip and lets the real parser infer a single top-score winner', async () => {
    await setupValidSession();

    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });

    headersMock.mockResolvedValue(
      new Headers({
        'x-real-ip': '198.51.100.77',
      }),
    );

    const formData = new FormData();
    formData.set('played_at', '2026-01-04T12:00:00.000Z');
    formData.set('player_id_0', String(alice.id));
    formData.set('score_0', '10');
    formData.set('player_id_1', String(bob.id));
    formData.set('score_1', '7');

    await createGameAction(formData);

    const [storedGame] = await db.select().from(games);
    expect(storedGame).toMatchObject({
      submittedFromIp: '198.51.100.77',
    });

    const storedPlayers = await db
      .select()
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, storedGame.id));

    const winnerIds = storedPlayers
      .filter((player) => player.isWinner)
      .map((player) => player.playerId);
    expect(winnerIds).toEqual([alice.id]);
  });

  test('persists a null submitted_from_ip when the selected forwarding header is malformed', async () => {
    await setupValidSession();

    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });

    // A malformed cf-connecting-ip must not reach the inet column and abort the
    // insert; it is rejected before persistence and does not fall through to the
    // otherwise-valid x-forwarded-for / x-real-ip headers.
    headersMock.mockResolvedValue(
      new Headers({
        'cf-connecting-ip': 'not-an-ip',
        'x-forwarded-for': '198.51.100.1',
        'x-real-ip': '198.51.100.9',
      }),
    );

    const formData = new FormData();
    formData.set('played_at', '2026-01-05T12:00:00.000Z');
    formData.set('player_id_0', String(alice.id));
    formData.set('score_0', '11');
    formData.set('player_id_1', String(bob.id));
    formData.set('score_1', '6');

    await expect(createGameAction(formData)).resolves.toEqual({ ok: true });

    const storedGames = await db.select().from(games);
    expect(storedGames).toHaveLength(1);
    expect(storedGames[0]).toMatchObject({
      submittedFromIp: null,
    });
  });
});

describe('unlockGameCreationAction', () => {
  it('returns not-configured error when no password is set', async () => {
    const state = await unlockGameCreationAction(
      { ok: false },
      buildFormData({ password: 'any' }),
    );
    expect(state).toEqual({ ok: false, error: 'not-configured' });
  });

  it('returns incorrect error when wrong password is provided', async () => {
    await setNewGamePassword('correct-password');
    const state = await unlockGameCreationAction(
      { ok: false },
      buildFormData({ password: 'wrong' }),
    );
    expect(state).toEqual({ ok: false, error: 'incorrect' });
  });

  it('sets hs_game cookie and returns ok when correct password is provided', async () => {
    vi.stubEnv('ADMIN_SESSION_SECRET', 'test-secret');
    await setNewGamePassword('correct-password');

    const setCookieMock = vi.fn();
    vi.mocked(cookies).mockResolvedValue({
      get: vi.fn(),
      set: setCookieMock,
    } as unknown as Awaited<ReturnType<typeof cookies>>);

    const state = await unlockGameCreationAction(
      { ok: false },
      buildFormData({ password: 'correct-password' }),
    );
    expect(state).toEqual({ ok: true });
    expect(setCookieMock).toHaveBeenCalledWith(
      'hs_game',
      expect.stringMatching(/^game:[0-9a-f]{12}:\d+\.[0-9a-f]+$/),
      expect.objectContaining({ httpOnly: true, path: '/', maxAge: 60 * 60 * 24 * 30 }),
    );
  });
});
