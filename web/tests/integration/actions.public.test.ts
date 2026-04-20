import { beforeEach, describe, expect, test, vi } from 'vitest';
import { eq } from 'drizzle-orm';
import { createGameAction } from '@/app/actions';
import { db } from '@/lib/db';
import { gamePlayers, games } from '@/db/schema';
import { createTestPlayer } from '../helpers/db';

const { headersMock } = vi.hoisted(() => ({
  headersMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: headersMock,
}));

describe('createGameAction', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    headersMock.mockResolvedValue(new Headers());
  });

  test('parses submitted form data and persists a game using the first forwarded IP', async () => {
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

    await createGameAction(formData);

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
});
