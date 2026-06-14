import { describe, expect, it } from 'vitest';

import { computeDominanceIndex, type GameParticipantRow } from '@/lib/stats';
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

describe('computeDominanceIndex', () => {
  it('averages each player’s share of the total points scored per game', () => {
    const dominance = computeDominanceIndex([
      // Game 1 total 20 -> shares Ada 0.5, Bob 0.25, Cara 0.25
      row(1, 1, 'Ada', 10, PlayerTier.Premium),
      row(1, 2, 'Bob', 5),
      row(1, 3, 'Cara', 5),
      // Game 2 total 12 -> shares Ada 0.5, Bob 0.5
      row(2, 1, 'Ada', 6, PlayerTier.Premium),
      row(2, 2, 'Bob', 6),
    ]);

    expect(dominance.map((player) => player.name)).toEqual(['Ada', 'Bob', 'Cara']);
    // Ada: (0.5 + 0.5) / 2 = 0.5
    expect(dominance[0]).toMatchObject({ dominance: 0.5, games: 2 });
    // Bob: (0.25 + 0.5) / 2 = 0.375
    expect(dominance[1]).toMatchObject({ dominance: 0.375, games: 2 });
    // Cara: 0.25 / 1
    expect(dominance[2]).toMatchObject({ dominance: 0.25, games: 1 });
  });

  it('skips games where every score is zero so they do not divide by zero', () => {
    const dominance = computeDominanceIndex([
      row(1, 1, 'Zed', 0),
      row(1, 2, 'Yan', 0),
    ]);

    expect(dominance).toEqual([]);
  });

  it('returns an empty array for no rows', () => {
    expect(computeDominanceIndex([])).toEqual([]);
  });
});
