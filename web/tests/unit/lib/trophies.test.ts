import { describe, expect, it } from 'vitest';

import {
  deriveTrophies,
  TROPHY_ATTENDANCE_STREAK,
  TROPHY_ELITE_RATING,
  TROPHY_EVER_PRESENT_MIN_TOTAL,
  TROPHY_EVER_PRESENT_RATE,
  TROPHY_FAMILIAR_GAMES,
  TROPHY_FIRST_RATE,
  TROPHY_MIN_SAMPLE,
  TROPHY_PODIUM_RATE,
  TROPHY_REGULAR_GAMES,
  TROPHY_RISING_RATING,
  TROPHY_RIVAL_WINS,
  TROPHY_VICTORY_MARGIN,
  TROPHY_VICTORY_MARGIN_MIN_WINS,
  TROPHY_WIN_DELTA,
  TROPHY_WIN_STREAK,
  type Trophy,
  type TrophyInput,
} from '@/lib/trophies';

function baseInput(overrides: Partial<TrophyInput> = {}): TrophyInput {
  return {
    games: 0,
    totalGames: 0,
    participationRate: 0,
    podiumRate: 0,
    firstRate: 0,
    winDelta: 0,
    averageVictoryMargin: null,
    winGames: 0,
    longestWinStreak: 0,
    attendanceStreak: 0,
    rating: null,
    rivals: [],
    ...overrides,
  };
}

function trophy(input: TrophyInput, id: string): Trophy {
  const found = deriveTrophies(input).trophies.find((candidate) => candidate.id === id);
  if (!found) {
    throw new Error(`Unknown trophy: ${id}`);
  }
  return found;
}

describe('deriveTrophies', () => {
  it('returns the full catalog with nothing earned for an empty history', () => {
    const cabinet = deriveTrophies(baseInput());

    expect(cabinet.totalCount).toBe(12);
    expect(cabinet.earnedCount).toBe(0);
    expect(cabinet.trophies.every((candidate) => !candidate.earned)).toBe(true);
  });

  it('is deterministic — identical input yields an identical cabinet', () => {
    const input = baseInput({ games: 25, longestWinStreak: 4 });
    expect(deriveTrophies(input)).toEqual(deriveTrophies(input));
  });

  it('preserves a stable category-grouped catalog order', () => {
    const categories = deriveTrophies(baseInput()).trophies.map((candidate) => candidate.category);
    expect(categories).toEqual([
      'participation',
      'participation',
      'performance',
      'performance',
      'performance',
      'performance',
      'improvement',
      'improvement',
      'streaks',
      'streaks',
      'rivalries',
      'rivalries',
    ]);
  });

  describe('participation', () => {
    it('awards Harbor Regular at the games threshold and not below it', () => {
      expect(trophy(baseInput({ games: TROPHY_REGULAR_GAMES }), 'harbor-regular').earned).toBe(true);
      expect(trophy(baseInput({ games: TROPHY_REGULAR_GAMES - 1 }), 'harbor-regular').earned).toBe(
        false,
      );
    });

    it('requires a minimum recorded-game count before Ever-Present can unlock', () => {
      const eligible = trophy(
        baseInput({
          participationRate: TROPHY_EVER_PRESENT_RATE,
          totalGames: TROPHY_EVER_PRESENT_MIN_TOTAL,
        }),
        'ever-present',
      );
      expect(eligible.earned).toBe(true);

      const tooFew = trophy(
        baseInput({
          participationRate: 1,
          totalGames: TROPHY_EVER_PRESENT_MIN_TOTAL - 1,
        }),
        'ever-present',
      );
      expect(tooFew.earned).toBe(false);
      expect(tooFew.detail).toContain('Needs');
    });
  });

  describe('performance', () => {
    it('gates rate-based badges behind the minimum sample size', () => {
      const belowSample = baseInput({
        games: TROPHY_MIN_SAMPLE - 1,
        podiumRate: 1,
        firstRate: 1,
        winDelta: 5,
      });
      expect(trophy(belowSample, 'podium-threat').earned).toBe(false);
      expect(trophy(belowSample, 'front-runner').earned).toBe(false);
      expect(trophy(belowSample, 'overperformer').earned).toBe(false);
    });

    it('awards podium, front-runner, and overperformer at their thresholds', () => {
      const input = baseInput({
        games: TROPHY_MIN_SAMPLE,
        podiumRate: TROPHY_PODIUM_RATE,
        firstRate: TROPHY_FIRST_RATE,
        winDelta: TROPHY_WIN_DELTA,
      });
      expect(trophy(input, 'podium-threat').earned).toBe(true);
      expect(trophy(input, 'front-runner').earned).toBe(true);
      expect(trophy(input, 'overperformer').earned).toBe(true);
    });

    it('requires enough wins before Commanding Wins evaluates the margin', () => {
      const tooFewWins = trophy(
        baseInput({
          averageVictoryMargin: TROPHY_VICTORY_MARGIN + 5,
          winGames: TROPHY_VICTORY_MARGIN_MIN_WINS - 1,
        }),
        'commanding-wins',
      );
      expect(tooFewWins.earned).toBe(false);

      const earned = trophy(
        baseInput({
          averageVictoryMargin: TROPHY_VICTORY_MARGIN,
          winGames: TROPHY_VICTORY_MARGIN_MIN_WINS,
        }),
        'commanding-wins',
      );
      expect(earned.earned).toBe(true);
      expect(earned.detail).toContain('average margin');
    });
  });

  describe('improvement', () => {
    it('never awards rating milestones while provisional', () => {
      const provisional = baseInput({
        rating: { displayRating: TROPHY_ELITE_RATING + 100, provisional: true, gamesPlayed: 3 },
      });
      expect(trophy(provisional, 'on-the-rise').earned).toBe(false);
      expect(trophy(provisional, 'harbor-elite').earned).toBe(false);
      expect(trophy(provisional, 'on-the-rise').detail).toContain('Provisional');
    });

    it('awards rating milestones once non-provisional and at the target', () => {
      const rising = baseInput({
        rating: { displayRating: TROPHY_RISING_RATING, provisional: false, gamesPlayed: 12 },
      });
      expect(trophy(rising, 'on-the-rise').earned).toBe(true);
      expect(trophy(rising, 'harbor-elite').earned).toBe(false);

      const elite = baseInput({
        rating: { displayRating: TROPHY_ELITE_RATING, provisional: false, gamesPlayed: 12 },
      });
      expect(trophy(elite, 'harbor-elite').earned).toBe(true);
    });

    it('reports no rated games when a player has no rating', () => {
      expect(trophy(baseInput(), 'on-the-rise').detail).toContain('No rated');
    });
  });

  describe('streaks', () => {
    it('awards On Fire and Iron Attendance at their thresholds', () => {
      expect(
        trophy(baseInput({ longestWinStreak: TROPHY_WIN_STREAK }), 'on-fire').earned,
      ).toBe(true);
      expect(
        trophy(baseInput({ longestWinStreak: TROPHY_WIN_STREAK - 1 }), 'on-fire').earned,
      ).toBe(false);
      expect(
        trophy(baseInput({ attendanceStreak: TROPHY_ATTENDANCE_STREAK }), 'iron-attendance').earned,
      ).toBe(true);
    });
  });

  describe('rivalries', () => {
    it('selects the most-beaten opponent for Dominant Rivalry with deterministic tie-breaks', () => {
      const cabinet = trophy(
        baseInput({
          rivals: [
            { opponentName: 'Bea', gamesTogether: 6, winsAgainstOpponent: TROPHY_RIVAL_WINS },
            { opponentName: 'Ada', gamesTogether: 6, winsAgainstOpponent: TROPHY_RIVAL_WINS },
          ],
        }),
        'dominant-rivalry',
      );
      expect(cabinet.earned).toBe(true);
      // Equal wins and shared games resolve alphabetically.
      expect(cabinet.detail).toContain('Ada');
    });

    it('selects the most-shared opponent for Familiar Foe', () => {
      const cabinet = trophy(
        baseInput({
          rivals: [
            { opponentName: 'Bea', gamesTogether: TROPHY_FAMILIAR_GAMES, winsAgainstOpponent: 1 },
            { opponentName: 'Ada', gamesTogether: 4, winsAgainstOpponent: 1 },
          ],
        }),
        'familiar-foe',
      );
      expect(cabinet.earned).toBe(true);
      expect(cabinet.detail).toContain('Bea');
    });

    it('leaves rivalry badges locked with no shared opponents', () => {
      expect(trophy(baseInput(), 'dominant-rivalry').earned).toBe(false);
      expect(trophy(baseInput(), 'familiar-foe').earned).toBe(false);
    });
  });

  it('counts earned trophies across categories', () => {
    const cabinet = deriveTrophies(
      baseInput({
        games: TROPHY_REGULAR_GAMES,
        longestWinStreak: TROPHY_WIN_STREAK,
        attendanceStreak: TROPHY_ATTENDANCE_STREAK,
      }),
    );
    expect(cabinet.earnedCount).toBe(3);
  });
});
