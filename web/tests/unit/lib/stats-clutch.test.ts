import { describe, expect, it } from 'vitest';

import { computeClutchFactor, type PlayerWinRateByGameSize } from '@/lib/stats';
import { PlayerTier } from '@/lib/player-tier';

function bucket(
  playerId: number,
  name: string,
  playerCount: number,
  games: number,
  wins: number,
  tier: PlayerTier = PlayerTier.Standard,
): PlayerWinRateByGameSize {
  return { playerId, name, tier, playerCount, games, wins, winRate: games > 0 ? wins / games : 0 };
}

describe('computeClutchFactor', () => {
  it('aggregates small (3-4P) and big (5-6P) tables and computes the swing', () => {
    const clutch = computeClutchFactor([
      // Ada: small 3P 4g/1w + 4P 2g/1w = 6g/2w (0.333); big 5P 4g/3w + 6P 2g/1w = 6g/4w (0.667)
      bucket(1, 'Ada', 3, 4, 1, PlayerTier.Premium),
      bucket(1, 'Ada', 4, 2, 1, PlayerTier.Premium),
      bucket(1, 'Ada', 5, 4, 3, PlayerTier.Premium),
      bucket(1, 'Ada', 6, 2, 1, PlayerTier.Premium),
      // Bob: small 3P 5g/4w (0.8); big 5P 5g/1w (0.2)
      bucket(2, 'Bob', 3, 5, 4),
      bucket(2, 'Bob', 5, 5, 1),
    ]);

    const ada = clutch.find((player) => player.name === 'Ada')!;
    expect(ada.smallGames).toBe(6);
    expect(ada.smallWins).toBe(2);
    expect(ada.smallRate).toBeCloseTo(1 / 3, 5);
    expect(ada.bigGames).toBe(6);
    expect(ada.bigWins).toBe(4);
    expect(ada.bigRate).toBeCloseTo(2 / 3, 5);
    expect(ada.delta).toBeCloseTo(2 / 3 - 1 / 3, 5);

    const bob = clutch.find((player) => player.name === 'Bob')!;
    expect(bob.bigRate).toBeCloseTo(0.2, 5);
    expect(bob.delta).toBeCloseTo(0.2 - 0.8, 5);

    // Sorted by big-table win rate descending: Ada (0.667) before Bob (0.2).
    expect(clutch.map((player) => player.name)).toEqual(['Ada', 'Bob']);
  });

  it('ignores table sizes outside 3-6P and leaves missing buckets null', () => {
    const clutch = computeClutchFactor([
      // Cara only plays 2P (excluded) and 5P (big only)
      bucket(3, 'Cara', 2, 3, 2),
      bucket(3, 'Cara', 5, 3, 1),
    ]);

    const cara = clutch.find((player) => player.name === 'Cara')!;
    expect(cara.smallGames).toBe(0);
    expect(cara.smallRate).toBeNull();
    expect(cara.bigRate).toBeCloseTo(1 / 3, 5);
    expect(cara.delta).toBeNull();
  });

  it('returns an empty array for no buckets', () => {
    expect(computeClutchFactor([])).toEqual([]);
  });
});
