import { describe, expect, it } from 'vitest';
import { PlayerTier } from '@/lib/player-tier';
import { getRatingReplay } from '@/lib/ratings';
import { createTestGame, createTestPlayer } from '@/tests/helpers/db';

describe('rating replay loader', () => {
  it('loads chronologically replayed multiplayer ratings and excludes solo games', async () => {
    const ada = await createTestPlayer({ name: 'Ada', tier: PlayerTier.Premium });
    const bea = await createTestPlayer({ name: 'Bea' });
    const cara = await createTestPlayer({ name: 'Cara' });

    await createTestGame({
      playedAt: new Date('2026-01-02T12:00:00.000Z'),
      players: [
        { playerId: bea.id, score: 10, isWinner: true },
        { playerId: ada.id, score: 9, isWinner: false },
        { playerId: cara.id, score: 9, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-01-01T12:00:00.000Z'),
      players: [
        { playerId: ada.id, score: 10, isWinner: true },
        { playerId: bea.id, score: 8, isWinner: false },
        { playerId: cara.id, score: 8, isWinner: false },
      ],
    });
    await createTestGame({
      players: [{ playerId: ada.id, score: 10, isWinner: true }],
    });

    const replay = await getRatingReplay();
    const byName = new Map(replay.players.map((player) => [player.name, player]));

    expect(replay.ratedGameCount).toBe(2);
    expect(byName.get('Ada')).toMatchObject({ gamesPlayed: 2, displayRating: 1505 });
    expect(byName.get('Bea')).toMatchObject({ gamesPlayed: 2, displayRating: 1506 });
    expect(byName.get('Cara')).toMatchObject({ gamesPlayed: 2, displayRating: 1488 });
  });
});
