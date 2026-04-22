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

    await deleteGame(game.id);

    expect(await db.select().from(games)).toHaveLength(0);
    expect(await db.select().from(gamePlayers)).toHaveLength(0);
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
        players: [{ playerId: ada.id, score: gameNumber, isWinner: true }],
      });
    }));

    const recentGames = await listRecentGames();

    expect(recentGames).toHaveLength(10);
    expect(recentGames.map((game) => game.id)).toEqual(
      createdGames.slice(-10).reverse().map((game) => game.id),
    );
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
        players: [{ playerId: ada.id, score: gameNumber, isWinner: true }],
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
