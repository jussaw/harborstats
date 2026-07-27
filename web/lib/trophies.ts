import { formatPercent, formatSignedNumber } from '@/lib/format';
import { INITIAL_RATING, PROVISIONAL_GAMES } from '@/lib/rating';

/**
 * Trophy Cabinet — a pure, deterministic derived badge engine.
 *
 * Every trophy is explainable: it is decided solely from a player's already
 * recorded, publicly visible statistics (the same figures shown elsewhere on
 * their profile). Nothing here is persisted, randomised, or time-dependent, so
 * the same input always yields the same cabinet. This mirrors the "Achievements
 * and Trophy Cabinet" product intent: reward meaningful participation,
 * performance, improvement, streaks, and notable rivalries while keeping every
 * badge derived and explainable.
 */

export type TrophyCategory =
  | 'participation'
  | 'performance'
  | 'improvement'
  | 'streaks'
  | 'rivalries';

export const TROPHY_CATEGORY_ORDER: TrophyCategory[] = [
  'participation',
  'performance',
  'improvement',
  'streaks',
  'rivalries',
];

export const TROPHY_CATEGORY_LABELS: Record<TrophyCategory, string> = {
  participation: 'Participation',
  performance: 'Performance',
  improvement: 'Improvement',
  streaks: 'Streaks',
  rivalries: 'Rivalries',
};

// Thresholds are exported so tests and future tuning share a single source of
// truth. Rate-based performance badges require a minimum sample so a single
// lucky game cannot mint a trophy.
export const TROPHY_MIN_SAMPLE = 8;
export const TROPHY_REGULAR_GAMES = 20;
export const TROPHY_EVER_PRESENT_RATE = 0.5;
export const TROPHY_EVER_PRESENT_MIN_TOTAL = 8;
export const TROPHY_PODIUM_RATE = 0.5;
export const TROPHY_FIRST_RATE = 0.3;
export const TROPHY_WIN_DELTA = 1;
export const TROPHY_VICTORY_MARGIN = 4;
export const TROPHY_VICTORY_MARGIN_MIN_WINS = 3;
export const TROPHY_RISING_RATING = INITIAL_RATING + 50;
export const TROPHY_ELITE_RATING = INITIAL_RATING + 100;
export const TROPHY_WIN_STREAK = 3;
export const TROPHY_ATTENDANCE_STREAK = 5;
export const TROPHY_RIVAL_WINS = 3;
export const TROPHY_FAMILIAR_GAMES = 10;

export interface TrophyRating {
  displayRating: number;
  provisional: boolean;
  gamesPlayed: number;
}

export interface TrophyRival {
  opponentName: string;
  gamesTogether: number;
  winsAgainstOpponent: number;
}

export interface TrophyInput {
  games: number;
  totalGames: number;
  participationRate: number;
  podiumRate: number;
  firstRate: number;
  winDelta: number;
  averageVictoryMargin: number | null;
  winGames: number;
  longestWinStreak: number;
  attendanceStreak: number;
  rating: TrophyRating | null;
  rivals: TrophyRival[];
}

export interface Trophy {
  id: string;
  name: string;
  category: TrophyCategory;
  /** Static explanation of how the trophy is earned. */
  requirement: string;
  earned: boolean;
  /** Evidence when earned, or progress toward the requirement when locked. */
  detail: string;
}

export interface TrophyCabinet {
  trophies: Trophy[];
  earnedCount: number;
  totalCount: number;
}

interface TrophyEvaluation {
  earned: boolean;
  detail: string;
}

interface TrophyDefinition {
  id: string;
  name: string;
  category: TrophyCategory;
  requirement: string;
  evaluate: (input: TrophyInput) => TrophyEvaluation;
}

function formatGames(count: number): string {
  return `${count} ${count === 1 ? 'game' : 'games'}`;
}

function formatWins(count: number): string {
  return `${count} ${count === 1 ? 'win' : 'wins'}`;
}

function pickTopRival(
  rivals: TrophyRival[],
  compare: (left: TrophyRival, right: TrophyRival) => number,
): TrophyRival | null {
  const [top] = [...rivals].sort(compare);
  return top ?? null;
}

function evaluateRatingMilestone(rating: TrophyRating | null, target: number): TrophyEvaluation {
  if (rating === null) {
    return { earned: false, detail: 'No rated multiplayer games yet' };
  }
  if (rating.provisional) {
    return {
      earned: false,
      detail: `Provisional (${Math.min(
        rating.gamesPlayed,
        PROVISIONAL_GAMES,
      )}/${PROVISIONAL_GAMES} rated games)`,
    };
  }
  return {
    earned: rating.displayRating >= target,
    detail: `Elo ${rating.displayRating}`,
  };
}

const TROPHY_DEFINITIONS: TrophyDefinition[] = [
  {
    id: 'harbor-regular',
    name: 'Harbor Regular',
    category: 'participation',
    requirement: `Appear in at least ${TROPHY_REGULAR_GAMES} recorded games.`,
    evaluate: ({ games }) => ({
      earned: games >= TROPHY_REGULAR_GAMES,
      detail:
        games >= TROPHY_REGULAR_GAMES
          ? `Played ${formatGames(games)}`
          : `Played ${formatGames(games)} of ${TROPHY_REGULAR_GAMES}`,
    }),
  },
  {
    id: 'ever-present',
    name: 'Ever-Present',
    category: 'participation',
    requirement: `Appear in at least ${formatPercent(
      TROPHY_EVER_PRESENT_RATE,
      0,
    )} of all recorded games (min ${TROPHY_EVER_PRESENT_MIN_TOTAL} total games).`,
    evaluate: ({ participationRate, totalGames }) => {
      const eligible = totalGames >= TROPHY_EVER_PRESENT_MIN_TOTAL;
      const earned = eligible && participationRate >= TROPHY_EVER_PRESENT_RATE;
      if (!eligible) {
        return {
          earned: false,
          detail: `Needs ${TROPHY_EVER_PRESENT_MIN_TOTAL} recorded games (only ${formatGames(
            totalGames,
          )} so far)`,
        };
      }
      return {
        earned,
        detail: `Appeared in ${formatPercent(participationRate, 1)} of all games`,
      };
    },
  },
  {
    id: 'podium-threat',
    name: 'Podium Threat',
    category: 'performance',
    requirement: `Finish on the podium in at least ${formatPercent(
      TROPHY_PODIUM_RATE,
      0,
    )} of games (min ${TROPHY_MIN_SAMPLE} games).`,
    evaluate: ({ podiumRate, games }) => {
      if (games < TROPHY_MIN_SAMPLE) {
        return {
          earned: false,
          detail: `Needs ${TROPHY_MIN_SAMPLE} games (only ${formatGames(games)} so far)`,
        };
      }
      return {
        earned: podiumRate >= TROPHY_PODIUM_RATE,
        detail: `${formatPercent(podiumRate, 1)} podium rate across ${formatGames(games)}`,
      };
    },
  },
  {
    id: 'front-runner',
    name: 'Front-Runner',
    category: 'performance',
    requirement: `Win at least ${formatPercent(TROPHY_FIRST_RATE, 0)} of games (min ${
      TROPHY_MIN_SAMPLE
    } games).`,
    evaluate: ({ firstRate, games }) => {
      if (games < TROPHY_MIN_SAMPLE) {
        return {
          earned: false,
          detail: `Needs ${TROPHY_MIN_SAMPLE} games (only ${formatGames(games)} so far)`,
        };
      }
      return {
        earned: firstRate >= TROPHY_FIRST_RATE,
        detail: `${formatPercent(firstRate, 1)} first-place rate across ${formatGames(games)}`,
      };
    },
  },
  {
    id: 'overperformer',
    name: 'Overperformer',
    category: 'performance',
    requirement: `Beat the 1/N baseline expectation by at least ${formatSignedNumber(
      TROPHY_WIN_DELTA,
      0,
    )} win (min ${TROPHY_MIN_SAMPLE} games).`,
    evaluate: ({ winDelta, games }) => {
      if (games < TROPHY_MIN_SAMPLE) {
        return {
          earned: false,
          detail: `Needs ${TROPHY_MIN_SAMPLE} games (only ${formatGames(games)} so far)`,
        };
      }
      return {
        earned: winDelta >= TROPHY_WIN_DELTA,
        detail: `${formatSignedNumber(winDelta, 1)} wins vs expectation`,
      };
    },
  },
  {
    id: 'commanding-wins',
    name: 'Commanding Wins',
    category: 'performance',
    requirement: `Average a victory margin of at least ${TROPHY_VICTORY_MARGIN} points (min ${
      TROPHY_VICTORY_MARGIN_MIN_WINS
    } wins).`,
    evaluate: ({ averageVictoryMargin, winGames }) => {
      if (winGames < TROPHY_VICTORY_MARGIN_MIN_WINS || averageVictoryMargin === null) {
        return {
          earned: false,
          detail: `Needs ${TROPHY_VICTORY_MARGIN_MIN_WINS} wins (only ${formatWins(
            winGames,
          )} so far)`,
        };
      }
      return {
        earned: averageVictoryMargin >= TROPHY_VICTORY_MARGIN,
        detail: `${averageVictoryMargin.toFixed(1)}-point average margin across ${formatWins(
          winGames,
        )}`,
      };
    },
  },
  {
    id: 'on-the-rise',
    name: 'On the Rise',
    category: 'improvement',
    requirement: `Reach a non-provisional multiplayer Elo of ${TROPHY_RISING_RATING} (${
      TROPHY_RISING_RATING - INITIAL_RATING
    } above the ${INITIAL_RATING} start).`,
    evaluate: ({ rating }) => evaluateRatingMilestone(rating, TROPHY_RISING_RATING),
  },
  {
    id: 'harbor-elite',
    name: 'Harbor Elite',
    category: 'improvement',
    requirement: `Reach a non-provisional multiplayer Elo of ${TROPHY_ELITE_RATING}.`,
    evaluate: ({ rating }) => evaluateRatingMilestone(rating, TROPHY_ELITE_RATING),
  },
  {
    id: 'on-fire',
    name: 'On Fire',
    category: 'streaks',
    requirement: `Win ${TROPHY_WIN_STREAK} or more games in a row.`,
    evaluate: ({ longestWinStreak }) => ({
      earned: longestWinStreak >= TROPHY_WIN_STREAK,
      detail:
        longestWinStreak >= TROPHY_WIN_STREAK
          ? `Best run of ${formatWins(longestWinStreak)} in a row`
          : `Best run so far: ${formatWins(longestWinStreak)} in a row`,
    }),
  },
  {
    id: 'iron-attendance',
    name: 'Iron Attendance',
    category: 'streaks',
    requirement: `Join ${TROPHY_ATTENDANCE_STREAK} or more consecutive recorded games.`,
    evaluate: ({ attendanceStreak }) => ({
      earned: attendanceStreak >= TROPHY_ATTENDANCE_STREAK,
      detail:
        attendanceStreak >= TROPHY_ATTENDANCE_STREAK
          ? `Attended ${formatGames(attendanceStreak)} in a row`
          : `Best run so far: ${formatGames(attendanceStreak)} in a row`,
    }),
  },
  {
    id: 'dominant-rivalry',
    name: 'Dominant Rivalry',
    category: 'rivalries',
    requirement: `Beat a single opponent at least ${TROPHY_RIVAL_WINS} times across shared games.`,
    evaluate: ({ rivals }) => {
      const rival = pickTopRival(
        rivals,
        (left, right) =>
          right.winsAgainstOpponent - left.winsAgainstOpponent ||
          right.gamesTogether - left.gamesTogether ||
          left.opponentName.localeCompare(right.opponentName),
      );
      if (!rival || rival.winsAgainstOpponent === 0) {
        return { earned: false, detail: 'No wins against a shared opponent yet' };
      }
      return {
        earned: rival.winsAgainstOpponent >= TROPHY_RIVAL_WINS,
        detail: `${formatWins(rival.winsAgainstOpponent)} against ${rival.opponentName}`,
      };
    },
  },
  {
    id: 'familiar-foe',
    name: 'Familiar Foe',
    category: 'rivalries',
    requirement: `Share at least ${TROPHY_FAMILIAR_GAMES} recorded games with one opponent.`,
    evaluate: ({ rivals }) => {
      const rival = pickTopRival(
        rivals,
        (left, right) =>
          right.gamesTogether - left.gamesTogether ||
          left.opponentName.localeCompare(right.opponentName),
      );
      if (!rival || rival.gamesTogether === 0) {
        return { earned: false, detail: 'No shared opponents yet' };
      }
      return {
        earned: rival.gamesTogether >= TROPHY_FAMILIAR_GAMES,
        detail: `${formatGames(rival.gamesTogether)} shared with ${rival.opponentName}`,
      };
    },
  },
];

export function deriveTrophies(input: TrophyInput): TrophyCabinet {
  const trophies = TROPHY_DEFINITIONS.map((definition) => {
    const { earned, detail } = definition.evaluate(input);
    return {
      id: definition.id,
      name: definition.name,
      category: definition.category,
      requirement: definition.requirement,
      earned,
      detail,
    };
  });

  return {
    trophies,
    earnedCount: trophies.filter((trophy) => trophy.earned).length,
    totalCount: trophies.length,
  };
}
