import { describe, expect, it } from 'vitest';

import { computeNailBiterRecords, type GameParticipantRow } from '@/lib/stats';
import { PlayerTier } from '@/lib/player-tier';

function row(
  gameId: number,
  playerId: number,
  name: string,
  score: number,
  isWinner = false,
  tier: PlayerTier = PlayerTier.Standard,
): GameParticipantRow {
  return { gameId, playerId, name, tier, score, isWinner };
}

describe('computeNailBiterRecords', () => {
  it('counts appearances and wins only in games decided by two points or fewer', () => {
    const records = computeNailBiterRecords([
      // Game 1 margin 1 -> nail-biter (Ada wins)
      row(1, 1, 'Ada', 10, true, PlayerTier.Premium),
      row(1, 2, 'Bob', 9),
      row(1, 3, 'Cara', 3),
      // Game 2 margin 3 -> NOT a nail-biter
      row(2, 1, 'Ada', 12, true, PlayerTier.Premium),
      row(2, 2, 'Bob', 9),
      row(2, 3, 'Cara', 5),
      // Game 3 margin 2 -> nail-biter (Bob wins)
      row(3, 2, 'Bob', 8, true),
      row(3, 3, 'Cara', 6),
    ]);

    expect(records.map((player) => player.name)).toEqual(['Ada', 'Bob', 'Cara']);
    expect(records[0]).toMatchObject({ nailBiterGames: 1, nailBiterWins: 1, winRate: 1 });
    expect(records[1]).toMatchObject({ nailBiterGames: 2, nailBiterWins: 1, winRate: 0.5 });
    expect(records[2]).toMatchObject({ nailBiterGames: 2, nailBiterWins: 0, winRate: 0 });
  });

  it('ignores games with no winner or no losers', () => {
    const records = computeNailBiterRecords([
      // No winner flagged
      row(1, 1, 'Ada', 9),
      row(1, 2, 'Bob', 8),
      // Only a winner, no losers
      row(2, 1, 'Ada', 9, true),
    ]);

    expect(records).toEqual([]);
  });

  it('returns an empty array when no games are close enough', () => {
    const records = computeNailBiterRecords([
      row(1, 1, 'Ada', 12, true),
      row(1, 2, 'Bob', 5),
    ]);

    expect(records).toEqual([]);
  });
});
