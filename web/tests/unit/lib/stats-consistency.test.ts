import { describe, expect, it } from 'vitest';

import { computeConsistencyRatings, type GameParticipantRow } from '@/lib/stats';
import { PlayerTier } from '@/lib/player-tier';

function row(
  gameId: number,
  playerId: number,
  name: string,
  score: number,
  tier: PlayerTier = PlayerTier.Standard,
): GameParticipantRow {
  return { gameId, playerId, name, tier, score, isWinner: false };
}

describe('computeConsistencyRatings', () => {
  it('computes the sample standard deviation and average per player', () => {
    const ratings = computeConsistencyRatings([
      // Ada: [10, 10, 10] -> mean 10, sample variance 0, stdDev 0
      row(1, 1, 'Ada', 10, PlayerTier.Premium),
      row(2, 1, 'Ada', 10, PlayerTier.Premium),
      row(3, 1, 'Ada', 10, PlayerTier.Premium),
      // Bea: [8, 12] -> mean 10, sample variance (4+4)/1 = 8, stdDev ~2.83 -> 2.8
      row(1, 2, 'Bea', 8),
      row(2, 2, 'Bea', 12),
      // Cara: [5, 10, 15] -> mean 10, sample variance (25+0+25)/2 = 25, stdDev 5
      row(1, 3, 'Cara', 5),
      row(2, 3, 'Cara', 10),
      row(3, 3, 'Cara', 15),
    ]);

    expect(ratings.map((player) => player.name)).toEqual(['Ada', 'Bea', 'Cara']);
    expect(ratings[0]).toMatchObject({ stdDev: 0, averageScore: 10, games: 3 });
    expect(ratings[1]).toMatchObject({ stdDev: 2.8, averageScore: 10, games: 2 });
    expect(ratings[2]).toMatchObject({ stdDev: 5, averageScore: 10, games: 3 });
  });

  it('treats a single-game player as perfectly consistent (no spread)', () => {
    const ratings = computeConsistencyRatings([row(1, 1, 'Solo', 7)]);

    expect(ratings).toEqual([
      { playerId: 1, name: 'Solo', tier: PlayerTier.Standard, games: 1, averageScore: 7, stdDev: 0 },
    ]);
  });

  it('breaks ties on equal std-dev by games played, then tier and name', () => {
    const ratings = computeConsistencyRatings([
      // Std (standard tier) and Pre (premium) both have stdDev 2.8 over 2 games.
      row(1, 1, 'Std', 8),
      row(2, 1, 'Std', 12),
      row(1, 2, 'Pre', 4, PlayerTier.Premium),
      row(2, 2, 'Pre', 8, PlayerTier.Premium),
    ]);

    // Equal stdDev and games -> premium tier sorts ahead.
    expect(ratings.map((player) => player.name)).toEqual(['Pre', 'Std']);
    expect(ratings[0].stdDev).toBe(ratings[1].stdDev);
  });

  it('returns an empty array for no rows', () => {
    expect(computeConsistencyRatings([])).toEqual([]);
  });
});
