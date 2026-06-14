import { describe, expect, it } from 'vitest';

import { computeKingmakers, type GameOutcomeRow } from '@/lib/stats';
import { PlayerTier } from '@/lib/player-tier';

const PLAYED_AT = new Date('2026-01-01T00:00:00.000Z');

function row(
  gameId: number,
  playerId: number,
  name: string,
  isWinner: boolean,
  tier: PlayerTier = PlayerTier.Standard,
): GameOutcomeRow {
  return { gameId, playedAt: PLAYED_AT, playerId, name, tier, isWinner };
}

// Three players. Baseline per 3-player game = 1 / (3 - 1) = 0.5.
// g1-g3: B wins (A and C lose). g4: C wins (A and B lose).
function buildGames(): GameOutcomeRow[] {
  return [
    row(1, 2, 'B', true),
    row(1, 1, 'A', false),
    row(1, 3, 'C', false),

    row(2, 2, 'B', true),
    row(2, 1, 'A', false),
    row(2, 3, 'C', false),

    row(3, 2, 'B', true),
    row(3, 1, 'A', false),
    row(3, 3, 'C', false),

    row(4, 3, 'C', true),
    row(4, 1, 'A', false),
    row(4, 2, 'B', false),
  ];
}

describe('computeKingmakers', () => {
  it('finds the opponent who wins most above the 1/(N-1) baseline when a player loses', () => {
    const results = computeKingmakers(buildGames());

    // A loses 4 games (all with B present); B wins 3 -> rate 0.75 vs baseline 0.5 -> edge 0.25.
    // C loses 3 games (g1-g3, B present); B wins all 3 -> rate 1.0 vs baseline 0.5 -> edge 0.5.
    // B loses only g4: no opponent reaches the 3-game minimum, so B is excluded.
    expect(results.map((player) => player.name)).toEqual(['C', 'A']);

    const [topKingmaker, second] = results;
    expect(topKingmaker).toMatchObject({
      name: 'C',
      sharedLossGames: 3,
      beneficiaryWins: 3,
      baselineRate: 0.5,
      actualRate: 1,
      edge: 0.5,
    });
    expect(topKingmaker.beneficiary.name).toBe('B');

    expect(second).toMatchObject({
      name: 'A',
      sharedLossGames: 4,
      beneficiaryWins: 3,
      baselineRate: 0.5,
      actualRate: 0.75,
      edge: 0.25,
    });
    expect(second.beneficiary.name).toBe('B');
  });

  it('excludes opponents below the shared-game minimum', () => {
    // A loses two games; B present both times but that is below the 3-game minimum.
    const results = computeKingmakers([
      row(1, 2, 'B', true),
      row(1, 1, 'A', false),
      row(2, 2, 'B', true),
      row(2, 1, 'A', false),
    ]);

    expect(results).toEqual([]);
  });

  it('ignores games without exactly one winner', () => {
    const results = computeKingmakers([
      // No winner flagged
      row(1, 1, 'A', false),
      row(1, 2, 'B', false),
      row(1, 3, 'C', false),
    ]);

    expect(results).toEqual([]);
  });

  it('returns an empty array for no rows', () => {
    expect(computeKingmakers([])).toEqual([]);
  });
});
