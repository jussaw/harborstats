import { describe, expect, it } from 'vitest';
import { PlayerTier } from '@/lib/player-tier';
import { expectedScore, replayRatings } from '@/lib/rating';

const players = [
  { playerId: 1, name: 'A', tier: PlayerTier.Premium },
  { playerId: 2, name: 'B', tier: PlayerTier.Standard },
  { playerId: 3, name: 'C', tier: PlayerTier.Standard },
];

describe('rating replay', () => {
  it('computes symmetric expected scores', () => {
    expect(expectedScore(1500, 1500)).toBe(0.5);
    expect(expectedScore(1600, 1400) + expectedScore(1400, 1600)).toBeCloseTo(1, 12);
  });

  it('replays multiplayer results simultaneously and preserves the rating pool', () => {
    const result = replayRatings({
      players,
      games: [
        {
          gameId: 2,
          playedAt: '2026-01-02T00:00:00.000Z',
          participants: [
            { playerId: 2, score: 10, isWinner: true },
            { playerId: 1, score: 9, isWinner: false },
            { playerId: 3, score: 9, isWinner: false },
          ],
        },
        {
          gameId: 1,
          playedAt: '2026-01-01T00:00:00.000Z',
          participants: [
            { playerId: 3, score: 8, isWinner: false },
            { playerId: 1, score: 10, isWinner: true },
            { playerId: 2, score: 8, isWinner: false },
          ],
        },
      ],
    });

    const byId = new Map(result.players.map((player) => [player.playerId, player]));
    expect(result.ratedGameCount).toBe(2);
    expect(byId.get(1)?.rating).toBeCloseTo(1505.3788576586119, 10);
    expect(byId.get(2)?.rating).toBeCloseTo(1506.310571170694, 10);
    expect(byId.get(3)?.rating).toBeCloseTo(1488.310571170694, 10);
    expect(result.players.reduce((sum, player) => sum + player.rating, 0)).toBeCloseTo(4500, 10);
    expect(byId.get(1)?.history).toHaveLength(2);
    expect(byId.get(1)?.provisional).toBe(true);
  });

  it('ignores solo and zero-winner games, but rejects malformed participants', () => {
    const ignored = replayRatings({
      players,
      games: [
        {
          gameId: 1,
          playedAt: '2026-01-01T00:00:00.000Z',
          participants: [{ playerId: 1, score: 1, isWinner: true }],
        },
        {
          gameId: 2,
          playedAt: '2026-01-02T00:00:00.000Z',
          participants: [
            { playerId: 1, score: 1, isWinner: false },
            { playerId: 2, score: 0, isWinner: false },
          ],
        },
      ],
    });
    expect(ignored.ratedGameCount).toBe(0);
    expect(() =>
      replayRatings({
        players,
        games: [
          {
            gameId: 3,
            playedAt: '2026-01-03T00:00:00.000Z',
            participants: [
              { playerId: 1, score: 1, isWinner: true },
              { playerId: 1, score: 0, isWinner: false },
            ],
          },
        ],
      }),
    ).toThrow(/duplicate/i);
  });
});
