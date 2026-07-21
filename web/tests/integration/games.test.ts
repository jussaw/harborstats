import { asc, eq } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { gamePlayers, games } from '@/db/schema';
import { db } from '@/lib/db';
import {
  createGame,
  deleteGame,
  getGameForEdit,
  listGamesForPlayer,
  listGamesPage,
  listRecentGames,
  parseGameFormData,
  updateGame,
} from '@/lib/games';
import { createTestGame, createTestPlayer } from '@/tests/helpers/db';

function createGameFormData(
  rows: { playerId?: number | string; score?: number | string; isWinner?: boolean }[],
  input?: { playedAt?: string; notes?: string },
): FormData {
  const formData = new FormData();
  formData.set('played_at', input?.playedAt ?? '2026-04-20T15:16');

  if (input?.notes !== undefined) {
    formData.set('notes', input.notes);
  }

  rows.forEach((row, index) => {
    formData.set(`player_id_${index}`, row.playerId === undefined ? '' : String(row.playerId));
    if (row.score !== undefined) {
      formData.set(`score_${index}`, String(row.score));
    }
    if (row.isWinner) {
      formData.set(`is_winner_${index}`, '1');
    }
  });

  return formData;
}

describe('games lib', () => {
  it('skips incomplete player rows when parsing game form data', () => {
    const parsed = parseGameFormData(
      createGameFormData([
        { playerId: 1, score: 10 },
        { playerId: '', score: 8 },
        { playerId: 2 },
      ]),
    );

    expect(parsed.playedAt.toISOString()).toBe('2026-04-20T15:16:00.000Z');
    expect(parsed.notes).toBe('');
    expect(parsed.players).toEqual([{ playerId: 1, score: 10, isWinner: true }]);
  });

  it('preserves an explicit winner from the form data', () => {
    const parsed = parseGameFormData(
      createGameFormData([
        { playerId: 1, score: 5, isWinner: true },
        { playerId: 2, score: 9 },
      ]),
    );

    expect(parsed.players).toEqual([
      { playerId: 1, score: 5, isWinner: true },
      { playerId: 2, score: 9, isWinner: false },
    ]);
  });

  it('infers the only top-scoring player as the winner when no explicit winner is selected', () => {
    const parsed = parseGameFormData(
      createGameFormData([
        { playerId: 1, score: 12 },
        { playerId: 2, score: 8 },
      ]),
    );

    expect(parsed.players).toEqual([
      { playerId: 1, score: 12, isWinner: true },
      { playerId: 2, score: 8, isWinner: false },
    ]);
  });

  it('does not infer a winner when the top score is tied', () => {
    const parsed = parseGameFormData(
      createGameFormData([
        { playerId: 1, score: 10 },
        { playerId: 2, score: 10 },
      ]),
    );

    expect(parsed.players).toEqual([
      { playerId: 1, score: 10, isWinner: false },
      { playerId: 2, score: 10, isWinner: false },
    ]);
  });

  it('creates a game and its player rows in the database', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const bea = await createTestPlayer({ name: 'Bea' });

    await createGame({
      playedAt: new Date('2026-04-20T18:00:00.000Z'),
      notes: 'Harbor night',
      submittedFromIp: '127.0.0.1',
      players: [
        { playerId: bea.id, score: 8, isWinner: false },
        { playerId: ada.id, score: 12, isWinner: true },
      ],
    });

    const storedGames = await db.select().from(games);
    const storedPlayers = await db.select().from(gamePlayers).orderBy(asc(gamePlayers.playerId));

    expect(storedGames).toHaveLength(1);
    expect(storedGames[0]?.notes).toBe('Harbor night');
    expect(storedGames[0]?.submittedFromIp).toBe('127.0.0.1');
    expect(storedPlayers).toEqual([
      expect.objectContaining({ playerId: ada.id, score: 12, isWinner: true }),
      expect.objectContaining({ playerId: bea.id, score: 8, isWinner: false }),
    ]);
  });

  it('rejects empty games before creating a database row', async () => {
    await expect(
      createGame({
        playedAt: new Date('2026-04-20T18:00:00.000Z'),
        notes: '',
        submittedFromIp: null,
        players: [],
      }),
    ).rejects.toThrow('Game must include at least one player.');

    expect(await db.select().from(games)).toHaveLength(0);
  });

  it('rejects duplicate players before creating a database row', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });

    await expect(
      createGame({
        playedAt: new Date('2026-04-20T18:00:00.000Z'),
        notes: '',
        submittedFromIp: null,
        players: [
          { playerId: ada.id, score: 10, isWinner: true },
          { playerId: ada.id, score: 8, isWinner: false },
        ],
      }),
    ).rejects.toThrow('Each player can only appear once per game.');

    expect(await db.select().from(games)).toHaveLength(0);
  });

  it('rejects invalid player ids before creating a database row', async () => {
    await expect(
      createGame({
        playedAt: new Date('2026-04-20T18:00:00.000Z'),
        notes: '',
        submittedFromIp: null,
        players: [{ playerId: 0, score: 10, isWinner: true }],
      }),
    ).rejects.toThrow('Player id must be a positive integer.');

    expect(await db.select().from(games)).toHaveLength(0);
  });

  it('rejects invalid scores before creating a database row', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });

    await expect(
      createGame({
        playedAt: new Date('2026-04-20T18:00:00.000Z'),
        notes: '',
        submittedFromIp: null,
        players: [{ playerId: ada.id, score: 31, isWinner: true }],
      }),
    ).rejects.toThrow('Score must be an integer from 0 to 30.');

    expect(await db.select().from(games)).toHaveLength(0);
  });

  it('rejects invalid played-at dates before creating a database row', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });

    await expect(
      createGame({
        playedAt: new Date('not-a-date'),
        notes: '',
        submittedFromIp: null,
        players: [{ playerId: ada.id, score: 10, isWinner: true }],
      }),
    ).rejects.toThrow('Played date must be valid.');

    expect(await db.select().from(games)).toHaveLength(0);
  });

  it('rejects multiple explicit winners before creating a database row', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const bea = await createTestPlayer({ name: 'Bea' });

    await expect(
      createGame({
        playedAt: new Date('2026-04-20T18:00:00.000Z'),
        notes: '',
        submittedFromIp: null,
        players: [
          { playerId: ada.id, score: 10, isWinner: true },
          { playerId: bea.id, score: 8, isWinner: true },
        ],
      }),
    ).rejects.toThrow('Game must have exactly one winner.');

    expect(await db.select().from(games)).toHaveLength(0);
  });

  it('rejects tied implicit winners before creating a database row', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const bea = await createTestPlayer({ name: 'Bea' });

    await expect(
      createGame({
        playedAt: new Date('2026-04-20T18:00:00.000Z'),
        notes: '',
        submittedFromIp: null,
        players: [
          { playerId: ada.id, score: 10, isWinner: false },
          { playerId: bea.id, score: 10, isWinner: false },
        ],
      }),
    ).rejects.toThrow('Tie games require an explicit single winner.');

    expect(await db.select().from(games)).toHaveLength(0);
  });

  it('accepts a valid explicit winner', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const bea = await createTestPlayer({ name: 'Bea' });

    await createGame({
      playedAt: new Date('2026-04-20T18:00:00.000Z'),
      notes: '',
      submittedFromIp: null,
      players: [
        { playerId: ada.id, score: 8, isWinner: false },
        { playerId: bea.id, score: 10, isWinner: true },
      ],
    });

    const storedPlayers = await db.select().from(gamePlayers).orderBy(asc(gamePlayers.playerId));
    expect(storedPlayers).toEqual([
      expect.objectContaining({ playerId: ada.id, score: 8, isWinner: false }),
      expect.objectContaining({ playerId: bea.id, score: 10, isWinner: true }),
    ]);
  });

  it('accepts and stores an implicit winner when there is one unique high score', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const bea = await createTestPlayer({ name: 'Bea' });

    await createGame({
      playedAt: new Date('2026-04-20T18:00:00.000Z'),
      notes: '',
      submittedFromIp: null,
      players: [
        { playerId: ada.id, score: 12, isWinner: false },
        { playerId: bea.id, score: 9, isWinner: false },
      ],
    });

    const storedPlayers = await db.select().from(gamePlayers).orderBy(asc(gamePlayers.playerId));
    expect(storedPlayers).toEqual([
      expect.objectContaining({ playerId: ada.id, score: 12, isWinner: true }),
      expect.objectContaining({ playerId: bea.id, score: 9, isWinner: false }),
    ]);
  });

  it('rejects invalid updates before replacing existing player rows', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const bea = await createTestPlayer({ name: 'Bea' });
    const game = await createTestGame({
      notes: 'Original notes',
      players: [
        { playerId: ada.id, score: 7, isWinner: true },
        { playerId: bea.id, score: 6, isWinner: false },
      ],
    });

    await expect(
      updateGame(game.id, {
        playedAt: new Date('2026-04-22T20:45:00.000Z'),
        notes: 'Updated notes',
        players: [],
      }),
    ).rejects.toThrow('Game must include at least one player.');

    const storedPlayers = await db
      .select()
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, game.id))
      .orderBy(asc(gamePlayers.playerId));
    expect(storedPlayers).toEqual([
      expect.objectContaining({ playerId: ada.id, score: 7, isWinner: true }),
      expect.objectContaining({ playerId: bea.id, score: 6, isWinner: false }),
    ]);
  });

  it('updates a game and replaces its player rows', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const bea = await createTestPlayer({ name: 'Bea' });
    const cara = await createTestPlayer({ name: 'Cara' });
    const game = await createTestGame({
      notes: 'Original notes',
      players: [
        { playerId: ada.id, score: 7, isWinner: true },
        { playerId: bea.id, score: 6, isWinner: false },
      ],
    });

    await updateGame(game.id, {
      playedAt: new Date('2026-04-22T20:45:00.000Z'),
      notes: 'Updated notes',
      players: [
        { playerId: bea.id, score: 9, isWinner: false },
        { playerId: cara.id, score: 11, isWinner: true },
      ],
    });

    const [storedGame] = await db.select().from(games).where(eq(games.id, game.id));
    const storedPlayers = await db
      .select()
      .from(gamePlayers)
      .where(eq(gamePlayers.gameId, game.id))
      .orderBy(asc(gamePlayers.playerId));

    expect(storedGame?.playedAt.toISOString()).toBe('2026-04-22T20:45:00.000Z');
    expect(storedGame?.notes).toBe('Updated notes');
    expect(storedPlayers).toEqual([
      expect.objectContaining({ playerId: bea.id, score: 9, isWinner: false }),
      expect.objectContaining({ playerId: cara.id, score: 11, isWinner: true }),
    ]);
  });

  it('deletes a game and cascades its player rows', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const game = await createTestGame({
      players: [{ playerId: ada.id, score: 10, isWinner: true }],
    });

    await expect(deleteGame(game.id)).resolves.toBe(true);

    expect(await db.select().from(games)).toHaveLength(0);
    expect(await db.select().from(gamePlayers)).toHaveLength(0);
  });

  it('reports whether a row was removed and is a no-op on a repeat/missing delete', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const target = await createTestGame({
      players: [{ playerId: ada.id, score: 10, isWinner: true }],
    });
    const survivor = await createTestGame({
      players: [{ playerId: ada.id, score: 8, isWinner: true }],
    });

    // First delete removes the row and reports success.
    await expect(deleteGame(target.id)).resolves.toBe(true);
    // Second (stale/double) delete matches nothing and reports no-op.
    await expect(deleteGame(target.id)).resolves.toBe(false);
    // An id that never existed also reports no-op.
    await expect(deleteGame(999999)).resolves.toBe(false);

    // The unrelated game is untouched by any of the above.
    const remaining = await db.select().from(games).where(eq(games.id, survivor.id));
    expect(remaining).toHaveLength(1);
  });

  it('lists recent games ordered by played date and game id and groups player rows by game', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const bea = await createTestPlayer({ name: 'Bea' });
    const cara = await createTestPlayer({ name: 'Cara' });

    await createTestGame({
      playedAt: new Date('2026-04-18T10:00:00.000Z'),
      notes: 'Older game',
      players: [
        { playerId: cara.id, score: 5, isWinner: false },
        { playerId: ada.id, score: 9, isWinner: true },
      ],
    });

    const sameDayFirst = await createTestGame({
      playedAt: new Date('2026-04-19T10:00:00.000Z'),
      notes: 'Earlier same-day insert',
      players: [
        { playerId: bea.id, score: 7, isWinner: false },
        { playerId: ada.id, score: 11, isWinner: true },
      ],
    });

    const sameDaySecond = await createTestGame({
      playedAt: new Date('2026-04-19T10:00:00.000Z'),
      notes: 'Later same-day insert',
      players: [
        { playerId: cara.id, score: 6, isWinner: false },
        { playerId: bea.id, score: 12, isWinner: true },
      ],
    });

    const recentGames = await listRecentGames(2);

    expect(recentGames).toHaveLength(2);
    expect(recentGames.map((game) => game.id)).toEqual([sameDaySecond.id, sameDayFirst.id]);
    expect(recentGames[0]).toEqual({
      id: sameDaySecond.id,
      playedAt: new Date('2026-04-19T10:00:00.000Z'),
      notes: 'Later same-day insert',
      players: [
        { playerName: 'Bea', score: 12, isWinner: true },
        { playerName: 'Cara', score: 6, isWinner: false },
      ],
    });
    expect(recentGames[1]?.players).toEqual([
      { playerName: 'Ada', score: 11, isWinner: true },
      { playerName: 'Bea', score: 7, isWinner: false },
    ]);
  });

  it('defaults recent games to the latest 10 games', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });

    const createdGames = await Promise.all(Array.from({ length: 12 }, async (_unused, index) => {
      const gameNumber = index + 1;
      return createTestGame({
        playedAt: new Date(`2026-04-${String(gameNumber).padStart(2, '0')}T10:00:00.000Z`),
        notes: `Game ${gameNumber}`,
        // Constant score: gameNumber would exceed the 0-30 DB check constraint.
        players: [{ playerId: ada.id, score: 10, isWinner: true }],
      });
    }));

    const recentGames = await listRecentGames();

    expect(recentGames).toHaveLength(10);
    expect(recentGames.map((game) => game.id)).toEqual(
      createdGames.slice(-10).reverse().map((game) => game.id),
    );
  });

  it('returns every participant of an 11-player game when limiting to one game', async () => {
    const participants = await Promise.all(
      Array.from({ length: 11 }, (_unused, index) =>
        createTestPlayer({ name: `Player ${String(index + 1).padStart(2, '0')}` }),
      ),
    );

    const game = await createTestGame({
      playedAt: new Date('2026-05-01T10:00:00.000Z'),
      notes: 'Full table',
      players: participants.map((player, index) => ({
        playerId: player.id,
        score: index + 1,
        isWinner: index === participants.length - 1,
      })),
    });

    const recentGames = await listRecentGames(1);

    expect(recentGames).toHaveLength(1);
    expect(recentGames[0]?.id).toBe(game.id);
    expect(recentGames[0]?.players).toEqual(
      participants.map((player, index) => ({
        playerName: player.name,
        score: index + 1,
        isWinner: index === participants.length - 1,
      })),
    );
  });

  it('returns complete participants for both games when a newest full table exceeds the joined-row limit', async () => {
    const bigTable = await Promise.all(
      Array.from({ length: 20 }, (_unused, index) =>
        createTestPlayer({ name: `Big ${String(index + 1).padStart(2, '0')}` }),
      ),
    );
    const ada = await createTestPlayer({ name: 'Ada' });
    const bea = await createTestPlayer({ name: 'Bea' });

    const olderGame = await createTestGame({
      playedAt: new Date('2026-05-01T10:00:00.000Z'),
      notes: 'Older two-player game',
      players: [
        { playerId: ada.id, score: 9, isWinner: true },
        { playerId: bea.id, score: 7, isWinner: false },
      ],
    });

    const newerGame = await createTestGame({
      playedAt: new Date('2026-05-02T10:00:00.000Z'),
      notes: 'Newest full table',
      players: bigTable.map((player, index) => ({
        playerId: player.id,
        score: index === bigTable.length - 1 ? 21 : index,
        isWinner: index === bigTable.length - 1,
      })),
    });

    const recentGames = await listRecentGames(2);

    expect(recentGames).toHaveLength(2);
    expect(recentGames.map((game) => game.id)).toEqual([newerGame.id, olderGame.id]);
    expect(recentGames[0]?.players).toEqual(
      bigTable.map((player, index) => ({
        playerName: player.name,
        score: index === bigTable.length - 1 ? 21 : index,
        isWinner: index === bigTable.length - 1,
      })),
    );
    expect(recentGames[1]?.players).toEqual([
      { playerName: 'Ada', score: 9, isWinner: true },
      { playerName: 'Bea', score: 7, isWinner: false },
    ]);
  });

  it('lists the full game history for one player ordered newest-first', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const bea = await createTestPlayer({ name: 'Bea' });
    const cara = await createTestPlayer({ name: 'Cara' });

    const olderAdaGame = await createTestGame({
      playedAt: new Date('2026-04-18T10:00:00.000Z'),
      notes: 'Older Ada game',
      players: [
        { playerId: ada.id, score: 9, isWinner: true },
        { playerId: bea.id, score: 6, isWinner: false },
      ],
    });

    const sameMomentFirst = await createTestGame({
      playedAt: new Date('2026-04-19T10:00:00.000Z'),
      notes: 'Earlier insert',
      players: [
        { playerId: ada.id, score: 8, isWinner: false },
        { playerId: cara.id, score: 10, isWinner: true },
      ],
    });

    const sameMomentSecond = await createTestGame({
      playedAt: new Date('2026-04-19T10:00:00.000Z'),
      notes: 'Later insert',
      players: [
        { playerId: ada.id, score: 11, isWinner: true },
        { playerId: bea.id, score: 7, isWinner: false },
      ],
    });

    await createTestGame({
      playedAt: new Date('2026-04-20T10:00:00.000Z'),
      notes: 'Bea only',
      players: [
        { playerId: bea.id, score: 11, isWinner: true },
        { playerId: cara.id, score: 8, isWinner: false },
      ],
    });

    const playerGames = await listGamesForPlayer(ada.id);

    expect(playerGames.map((game) => game.id)).toEqual([
      sameMomentSecond.id,
      sameMomentFirst.id,
      olderAdaGame.id,
    ]);
    expect(playerGames).toEqual([
      {
        id: sameMomentSecond.id,
        playedAt: new Date('2026-04-19T10:00:00.000Z'),
        notes: 'Later insert',
        players: [
          { playerName: 'Ada', score: 11, isWinner: true },
          { playerName: 'Bea', score: 7, isWinner: false },
        ],
      },
      {
        id: sameMomentFirst.id,
        playedAt: new Date('2026-04-19T10:00:00.000Z'),
        notes: 'Earlier insert',
        players: [
          { playerName: 'Ada', score: 8, isWinner: false },
          { playerName: 'Cara', score: 10, isWinner: true },
        ],
      },
      {
        id: olderAdaGame.id,
        playedAt: new Date('2026-04-18T10:00:00.000Z'),
        notes: 'Older Ada game',
        players: [
          { playerName: 'Ada', score: 9, isWinner: true },
          { playerName: 'Bea', score: 6, isWinner: false },
        ],
      },
    ]);
  });

  it('lists a paginated slice of games with total counts and stable ordering', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });

    const createdGames = await Promise.all(Array.from({ length: 25 }, async (_unused, index) => {
      const day = index + 1
      return createTestGame({
        playedAt: new Date(`2026-04-${String(day).padStart(2, '0')}T10:00:00.000Z`),
        notes: `Game ${day}`,
        players: [{ playerId: ada.id, score: day, isWinner: true }],
      })
    }))

    const page = await listGamesPage(2, 20);

    expect(page.totalGames).toBe(25);
    expect(page.totalPages).toBe(2);
    expect(page.page).toBe(2);
    expect(page.pageSize).toBe(20);
    expect(page.games).toHaveLength(5);
    expect(page.games.map((game) => game.id)).toEqual(createdGames.slice(0, 5).reverse().map((game) => game.id));
  });

  it('clamps page requests past the last page and keeps same-day games ordered by game id', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const bea = await createTestPlayer({ name: 'Bea' });

    const olderGame = await createTestGame({
      playedAt: new Date('2026-04-18T10:00:00.000Z'),
      notes: 'Older game',
      players: [{ playerId: ada.id, score: 8, isWinner: true }],
    });

    const sameDayFirst = await createTestGame({
      playedAt: new Date('2026-04-19T10:00:00.000Z'),
      notes: 'Earlier same-day insert',
      players: [{ playerId: ada.id, score: 9, isWinner: true }],
    });

    const sameDaySecond = await createTestGame({
      playedAt: new Date('2026-04-19T10:00:00.000Z'),
      notes: 'Later same-day insert',
      players: [{ playerId: bea.id, score: 10, isWinner: true }],
    });

    const page = await listGamesPage(9, 2);

    expect(page.page).toBe(2);
    expect(page.totalPages).toBe(2);
    expect(page.games).toHaveLength(1);
    expect(page.games[0]?.id).toBe(olderGame.id);
    expect((await listGamesPage(1, 2)).games.map((game) => game.id)).toEqual([sameDaySecond.id, sameDayFirst.id]);
  });

  it('supports the allowed public page sizes', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });

    await Promise.all(Array.from({ length: 65 }, async (_unused, index) => {
      const gameNumber = index + 1
      return createTestGame({
        playedAt: new Date(`2026-03-${String((gameNumber % 28) + 1).padStart(2, '0')}T${String(gameNumber % 24).padStart(2, '0')}:00:00.000Z`),
        notes: `Game ${gameNumber}`,
        // Constant score: gameNumber would exceed the 0-30 DB check constraint.
        players: [{ playerId: ada.id, score: 10, isWinner: true }],
      })
    }))

    await expect(listGamesPage(1, 20)).resolves.toMatchObject({ pageSize: 20, totalPages: 4 });
    await expect(listGamesPage(1, 50)).resolves.toMatchObject({ pageSize: 50, totalPages: 2 });
    await expect(listGamesPage(1, 100)).resolves.toMatchObject({ pageSize: 100, totalPages: 1 });
  });

  it('filters paginated games by any selected player', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const bea = await createTestPlayer({ name: 'Bea' });
    const cara = await createTestPlayer({ name: 'Cara' });

    const adaGame = await createTestGame({
      playedAt: new Date('2026-04-17T10:00:00.000Z'),
      notes: 'Ada game',
      players: [{ playerId: ada.id, score: 8, isWinner: true }],
    });

    const beaGame = await createTestGame({
      playedAt: new Date('2026-04-18T10:00:00.000Z'),
      notes: 'Bea game',
      players: [{ playerId: bea.id, score: 9, isWinner: true }],
    });

    await createTestGame({
      playedAt: new Date('2026-04-19T10:00:00.000Z'),
      notes: 'Cara game',
      players: [{ playerId: cara.id, score: 10, isWinner: true }],
    });

    const page = await listGamesPage(1, 20, { playerIds: [ada.id, bea.id], from: null, to: null });

    expect(page.totalGames).toBe(2);
    expect(page.totalPages).toBe(1);
    expect(page.games.map((game) => game.id)).toEqual([beaGame.id, adaGame.id]);
  });

  it('supports open-ended played-at filters on paginated games', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });

    const olderGame = await createTestGame({
      playedAt: new Date('2026-04-17T10:00:00.000Z'),
      notes: 'Older game',
      players: [{ playerId: ada.id, score: 7, isWinner: true }],
    });

    const middleGame = await createTestGame({
      playedAt: new Date('2026-04-18T10:00:00.000Z'),
      notes: 'Middle game',
      players: [{ playerId: ada.id, score: 8, isWinner: true }],
    });

    const newerGame = await createTestGame({
      playedAt: new Date('2026-04-19T10:00:00.000Z'),
      notes: 'Newer game',
      players: [{ playerId: ada.id, score: 9, isWinner: true }],
    });

    await expect(
      listGamesPage(1, 20, { playerIds: [], from: new Date('2026-04-18T00:00:00.000Z'), to: null }),
    ).resolves.toMatchObject({
      totalGames: 2,
      games: [{ id: newerGame.id }, { id: middleGame.id }],
    });

    await expect(
      listGamesPage(1, 20, { playerIds: [], from: null, to: new Date('2026-04-18T23:59:59.999Z') }),
    ).resolves.toMatchObject({
      totalGames: 2,
      games: [{ id: middleGame.id }, { id: olderGame.id }],
    });
  });

  it('keeps filtered totals and page clamping correct when filters narrow the result set', async () => {
    const ada = await createTestPlayer({ name: 'Ada' });
    const bea = await createTestPlayer({ name: 'Bea' });

    await createTestGame({
      playedAt: new Date('2026-04-17T10:00:00.000Z'),
      notes: 'Older Ada game',
      players: [{ playerId: ada.id, score: 7, isWinner: true }],
    });

    const middleBeaGame = await createTestGame({
      playedAt: new Date('2026-04-18T10:00:00.000Z'),
      notes: 'Middle Bea game',
      players: [{ playerId: bea.id, score: 8, isWinner: true }],
    });

    const newerBeaGame = await createTestGame({
      playedAt: new Date('2026-04-19T10:00:00.000Z'),
      notes: 'Newer Bea game',
      players: [{ playerId: bea.id, score: 9, isWinner: true }],
    });

    const page = await listGamesPage(9, 1, {
      playerIds: [bea.id],
      from: new Date('2026-04-18T00:00:00.000Z'),
      to: new Date('2026-04-19T23:59:59.999Z'),
    });

    expect(page.totalGames).toBe(2);
    expect(page.totalPages).toBe(2);
    expect(page.page).toBe(2);
    expect(page.games.map((game) => game.id)).toEqual([middleBeaGame.id]);

    await expect(
      listGamesPage(1, 1, {
        playerIds: [bea.id],
        from: new Date('2026-04-18T00:00:00.000Z'),
        to: new Date('2026-04-19T23:59:59.999Z'),
      }),
    ).resolves.toMatchObject({
      games: [{ id: newerBeaGame.id }],
    });
  });

  it('returns a game ready for editing with players ordered by name', async () => {
    const cara = await createTestPlayer({ name: 'Cara' });
    const ada = await createTestPlayer({ name: 'Ada' });
    const bea = await createTestPlayer({ name: 'Bea' });
    const game = await createTestGame({
      notes: 'Editable game',
      players: [
        { playerId: cara.id, score: 5, isWinner: false },
        { playerId: ada.id, score: 9, isWinner: true },
        { playerId: bea.id, score: 7, isWinner: false },
      ],
    });

    await expect(getGameForEdit(game.id)).resolves.toEqual({
      id: game.id,
      playedAt: game.playedAt,
      notes: 'Editable game',
      players: [
        { playerId: ada.id, score: 9, isWinner: true },
        { playerId: bea.id, score: 7, isWinner: false },
        { playerId: cara.id, score: 5, isWinner: false },
      ],
    });
    await expect(getGameForEdit(9999)).resolves.toBeNull();
  });
});
