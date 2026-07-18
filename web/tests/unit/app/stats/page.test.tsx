import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import StatsPage from '@/app/stats/page';
import { PlayerTier } from '@/lib/player-tier';
import { getSettings } from '@/lib/settings';
import { getRatingReplay } from '@/lib/ratings';
import { getStatsPageData, type StatsPageData } from '@/lib/stats-page-data';

// `StatsPage` now loads every game/participant-sourced card through a single request-local bundle,
// `getStatsPageData` (`@/lib/stats-page-data`), instead of awaiting each public getter in `@/lib/stats`.
// Mock that bundle module wholesale so these server-render tests drive the stat cards directly with
// fixture bundles; the real orchestration (source getters + compute helpers) is covered by the
// DB-backed `tests/integration/stats-page-data.test.ts`, so this unit test never loads `@/lib/stats`.
vi.mock('@/lib/stats-page-data', () => ({
  getStatsPageData: vi.fn(),
}));

vi.mock('@/lib/settings', () => ({
  getSettings: vi.fn(),
}));

vi.mock('@/lib/ratings', () => ({
  getRatingReplay: vi.fn(),
}));

vi.mock('@/lib/players', () => ({
  getPlayers: vi.fn(() => Promise.resolve([])),
}));

// The player filter is a client component with its own coverage; stub it out so these
// server-render tests stay focused on the stat cards.
vi.mock('@/components/StatsPlayerFilter', () => ({
  StatsPlayerFilter: () => null,
}));

function emptyStatsPageData(): StatsPageData {
  return {
    winRates: [],
    scoreStats: [],
    scoreHistogramBuckets: [],
    perPlayerScoreDistributions: [],
    cumulativeScoreStats: [],
    normalizedScoreStats: [],
    podiumRates: [],
    finishBreakdowns: [],
    tierShowdown: [],
    expectedVsActualWins: [],
    gameActivityTimestamps: [],
    participationRates: [],
    playerAttendanceEvents: [],
    currentWinStreaks: [],
    playerWinEvents: [],
    playerStreakRecords: [],
    singleGameRecords: {
      highestScore: null,
      lowestWinningScore: null,
      biggestBlowout: null,
      closestGame: null,
    },
    winningScoreComparison: {
      winnerRows: 0,
      nonWinnerRows: 0,
      avgWinningScore: 0,
      avgLosingScore: 0,
      scoreGap: 0,
    },
    winningScoreByGameSize: [],
    headToHeadRecords: [],
    rivalryAggregates: [],
    consistencyRatings: [],
    dominanceIndex: [],
    nailBiterRecords: [],
    clutchFactors: [],
    kingmakers: [],
  };
}

let statsPageData: StatsPageData;

function setStatsPageData(overrides: Partial<StatsPageData>) {
  statsPageData = { ...statsPageData, ...overrides };
}

function mockDefaultStatsPageData() {
  statsPageData = emptyStatsPageData();
  vi.mocked(getStatsPageData).mockImplementation(async () => statsPageData);
  vi.mocked(getRatingReplay).mockResolvedValue({ players: [], ratedGameCount: 0 });
  vi.mocked(getSettings).mockResolvedValue({
    winRateMinGames: 2,
    podiumRateMinGames: 4,
    statCardMinGames: 5,
  });
}

vi.mock('@/components/PlayerOfMonthLeaderboard', () => ({
  PlayerOfMonthLeaderboard: ({
    players,
    winEvents,
  }: {
    players: { name: string }[];
    winEvents: { playerId: number }[];
  }) => (
    <div>
      Player of the Month Leaderboard Mock: {players.length}/{winEvents.length}
    </div>
  ),
}));

describe('StatsPage', () => {
  beforeEach(() => {
    mockDefaultStatsPageData();
  });

  it('renders grouped stat sections and the planned card order', async () => {
    setStatsPageData({
      winRates: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 5,
          wins: 3,
          winRate: 0.6,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Premium,
          games: 4,
          wins: 2,
          winRate: 0.5,
        },
      ],
      scoreStats: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 5,
          avgScore: 9.4,
          medianScore: 9,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          games: 4,
          avgScore: 8.7,
          medianScore: 8.5,
        },
      ],
      cumulativeScoreStats: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 5,
          totalScore: 47,
          pointsPerGame: 9.4,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          games: 4,
          totalScore: 35,
          pointsPerGame: 8.8,
        },
      ],
      normalizedScoreStats: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 5,
          avgScore: 0.94,
          medianScore: 0.9,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          games: 4,
          avgScore: 0.87,
          medianScore: 0.85,
        },
      ],
      winningScoreComparison: {
        winnerRows: 6,
        nonWinnerRows: 5,
        avgWinningScore: 8.3,
        avgLosingScore: 5,
        scoreGap: 3.3,
      },
      winningScoreByGameSize: [
        { playerCount: 3, gameCount: 2, avgWinningScore: 9 },
        { playerCount: 4, gameCount: 1, avgWinningScore: 12 },
        { playerCount: 5, gameCount: 3, avgWinningScore: 10.7 },
      ],
      scoreHistogramBuckets: [
        { score: 5, count: 1 },
        { score: 6, count: 3 },
        { score: 7, count: 2 },
      ],
      perPlayerScoreDistributions: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          count: 6,
          min: 5,
          q1: 7,
          median: 8,
          q3: 9,
          max: 11,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          count: 5,
          min: 4,
          q1: 6,
          median: 7,
          q3: 8,
          max: 10,
        },
      ],
      podiumRates: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 5,
          podiums: 4,
          podiumRate: 0.8,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          games: 4,
          podiums: 2,
          podiumRate: 0.5,
        },
      ],
      finishBreakdowns: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 5,
          firsts: 3,
          seconds: 1,
          thirds: 0,
          lasts: 0,
          firstRate: 0.6,
          secondRate: 0.2,
          thirdRate: 0,
          lastRate: 0,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          games: 4,
          firsts: 1,
          seconds: 2,
          thirds: 1,
          lasts: 1,
          firstRate: 0.25,
          secondRate: 0.5,
          thirdRate: 0.25,
          lastRate: 0.25,
        },
      ],
      tierShowdown: [
        {
          tier: PlayerTier.Premium,
          players: 2,
          appearances: 9,
          wins: 4,
          winRate: 4 / 9,
        },
        {
          tier: PlayerTier.Standard,
          players: 3,
          appearances: 14,
          wins: 3,
          winRate: 3 / 14,
        },
      ],
      expectedVsActualWins: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 5,
          wins: 3,
          expectedWins: 1.8,
          winDelta: 1.2,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          games: 4,
          wins: 1,
          expectedWins: 1.5,
          winDelta: -0.5,
        },
      ],
      gameActivityTimestamps: [
        '2026-04-20T18:00:00.000Z',
        '2026-04-21T03:00:00.000Z',
        '2026-04-21T21:00:00.000Z',
      ],
      participationRates: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          gamesPlayed: 8,
          totalGames: 9,
          participationRate: 8 / 9,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          gamesPlayed: 6,
          totalGames: 9,
          participationRate: 2 / 3,
        },
      ],
      playerAttendanceEvents: [
        {
          playedAt: '2026-04-20T18:00:00.000Z',
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
        },
        {
          playedAt: '2026-04-20T18:00:00.000Z',
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
        },
      ],
      currentWinStreaks: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          streak: 2,
          mostRecentAppearance: '2026-04-21T03:00:00.000Z',
          mostRecentWin: '2026-04-21T03:00:00.000Z',
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          streak: 2,
          mostRecentAppearance: '2026-04-20T18:00:00.000Z',
          mostRecentWin: '2026-04-20T18:00:00.000Z',
        },
      ],
      playerWinEvents: [
        {
          playedAt: '2026-04-20T18:00:00.000Z',
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
        },
        {
          playedAt: '2026-04-21T03:00:00.000Z',
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
        },
        {
          playedAt: '2026-04-20T18:00:00.000Z',
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
        },
      ],
      playerStreakRecords: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          longestWinStreak: 3,
          longestWinStreakStartedAt: '2026-04-20T18:00:00.000Z',
          longestWinStreakEndedAt: '2026-04-22T18:00:00.000Z',
          currentLossStreak: 0,
          currentLossStreakStartedAt: null,
          currentLossStreakEndedAt: null,
          longestLossStreak: 1,
          longestLossStreakStartedAt: '2026-04-23T18:00:00.000Z',
          longestLossStreakEndedAt: '2026-04-23T18:00:00.000Z',
          attendanceStreak: 5,
          attendanceStreakStartedAt: '2026-04-18T18:00:00.000Z',
          attendanceStreakEndedAt: '2026-04-22T18:00:00.000Z',
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          longestWinStreak: 2,
          longestWinStreakStartedAt: '2026-04-18T18:00:00.000Z',
          longestWinStreakEndedAt: '2026-04-19T18:00:00.000Z',
          currentLossStreak: 1,
          currentLossStreakStartedAt: '2026-04-21T18:00:00.000Z',
          currentLossStreakEndedAt: '2026-04-21T18:00:00.000Z',
          longestLossStreak: 1,
          longestLossStreakStartedAt: '2026-04-21T18:00:00.000Z',
          longestLossStreakEndedAt: '2026-04-21T18:00:00.000Z',
          attendanceStreak: 4,
          attendanceStreakStartedAt: '2026-04-18T18:00:00.000Z',
          attendanceStreakEndedAt: '2026-04-21T18:00:00.000Z',
        },
      ],
      singleGameRecords: {
        highestScore: {
          gameId: 3,
          playedAt: '2026-04-22T18:00:00.000Z',
          playerId: 3,
          name: 'Cara',
          tier: PlayerTier.Standard,
          score: 20,
        },
        lowestWinningScore: {
          gameId: 4,
          playedAt: '2026-04-23T18:00:00.000Z',
          playerId: 4,
          name: 'Eve',
          tier: PlayerTier.Premium,
          score: 7,
        },
        biggestBlowout: {
          gameId: 5,
          playedAt: '2026-04-24T18:00:00.000Z',
          winners: [
            { playerId: 1, name: 'Ada', tier: PlayerTier.Premium },
            { playerId: 2, name: 'Bea', tier: PlayerTier.Standard },
          ],
          winnerScore: 15,
          runnerUpScore: 4,
          margin: 11,
          participantCount: 3,
        },
        closestGame: {
          gameId: 4,
          playedAt: '2026-04-23T18:00:00.000Z',
          winners: [{ playerId: 4, name: 'Eve', tier: PlayerTier.Premium }],
          winnerScore: 7,
          runnerUpScore: 7,
          margin: 0,
          participantCount: 3,
        },
      },
      headToHeadRecords: [
        {
          playerId: 1,
          playerName: 'Ada',
          playerTier: PlayerTier.Premium,
          opponentId: 2,
          opponentName: 'Bea',
          opponentTier: PlayerTier.Premium,
          gamesTogether: 4,
          winsAgainstOpponent: 2,
          lossesToOpponent: 1,
          timesOutscoredOpponent: 3,
          timesOutscoredByOpponent: 1,
        },
        {
          playerId: 2,
          playerName: 'Bea',
          playerTier: PlayerTier.Premium,
          opponentId: 1,
          opponentName: 'Ada',
          opponentTier: PlayerTier.Premium,
          gamesTogether: 4,
          winsAgainstOpponent: 1,
          lossesToOpponent: 2,
          timesOutscoredOpponent: 1,
          timesOutscoredByOpponent: 3,
        },
      ],
      rivalryAggregates: [
        {
          playerA: { playerId: 1, name: 'Ada', tier: PlayerTier.Premium },
          playerB: { playerId: 2, name: 'Bea', tier: PlayerTier.Standard },
          gamesTogether: 4,
          playerAWins: 2,
          playerBWins: 1,
          decidedGames: 3,
          closenessScore: 0.167,
        },
        {
          playerA: { playerId: 1, name: 'Ada', tier: PlayerTier.Premium },
          playerB: { playerId: 3, name: 'Cara', tier: PlayerTier.Standard },
          gamesTogether: 5,
          playerAWins: 5,
          playerBWins: 0,
          decidedGames: 5,
          closenessScore: 0.5,
        },
      ],
      consistencyRatings: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 5,
          averageScore: 9.4,
          stdDev: 1.2,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          games: 4,
          averageScore: 8.7,
          stdDev: 2.5,
        },
      ],
      dominanceIndex: [
        { playerId: 1, name: 'Ada', tier: PlayerTier.Premium, games: 5, dominance: 0.31 },
        { playerId: 2, name: 'Bea', tier: PlayerTier.Standard, games: 4, dominance: 0.24 },
      ],
      nailBiterRecords: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          nailBiterGames: 4,
          nailBiterWins: 3,
          winRate: 0.75,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          nailBiterGames: 3,
          nailBiterWins: 1,
          winRate: 1 / 3,
        },
      ],
      clutchFactors: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          smallGames: 3,
          smallWins: 1,
          smallRate: 1 / 3,
          bigGames: 4,
          bigWins: 3,
          bigRate: 0.75,
          delta: 0.75 - 1 / 3,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          smallGames: 4,
          smallWins: 3,
          smallRate: 0.75,
          bigGames: 3,
          bigWins: 1,
          bigRate: 1 / 3,
          delta: 1 / 3 - 0.75,
        },
      ],
      kingmakers: [
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          beneficiary: { playerId: 1, name: 'Ada', tier: PlayerTier.Premium },
          sharedLossGames: 4,
          beneficiaryWins: 3,
          baselineRate: 0.5,
          actualRate: 0.75,
          edge: 0.25,
        },
      ],
    });
    vi.mocked(getSettings).mockResolvedValue({
      winRateMinGames: 3,
      podiumRateMinGames: 4,
      statCardMinGames: 3,
    });

    const element = await StatsPage({ searchParams: Promise.resolve({}) });
    const markup = renderToStaticMarkup(element);

    expect(markup).not.toContain('All-Time Leaderboards');
    expect(markup).not.toContain('Stats Overview');
    // Section navigation now lives in the global sidebar, so the page renders no anchor nav links.
    expect(markup).not.toContain('href="#headline"');
    expect(markup).not.toContain('href="#total-wins"');
    expect(markup).toContain('data-page-width="7xl"');
    expect(markup).toContain('data-expand-on-collapse="true"');
    expect(markup).toContain('sm:px-6 sm:pb-8');
    expect(markup).toContain('id="stats-scroll"');
    expect(markup).toContain('overflow-y-auto');
    expect(markup).not.toContain('max-w-7xl');
    expect(markup).not.toContain('px-4 py-6');
    expect(markup).not.toContain('sm:px-6 sm:py-8');
    expect(markup).toContain('Min 3 games');
    expect(markup).toContain('Min 4 games');
    expect(markup).toContain('font-semibold text-(--gold)');
    expect(markup).toContain('Player of the Month');
    expect(markup).toContain('Bridesmaid');
    expect(markup).toContain('Player of the Month Leaderboard Mock: 2/3');
    expect(markup).not.toContain('ml-2 hidden rounded-sm bg-(--gold)/15');

    const headlineSectionIndex = markup.indexOf('id="headline"');
    const scoringSectionIndex = markup.indexOf('id="scoring"');
    const finishesSectionIndex = markup.indexOf('id="finishes"');
    const headToHeadSectionIndex = markup.indexOf('id="head-to-head"');
    const activitySectionIndex = markup.indexOf('id="activity"');
    const recordsSectionIndex = markup.indexOf('id="records"');
    const totalWinsIndex = markup.indexOf('id="total-wins"');
    const winRateIndex = markup.indexOf('id="win-rate"');
    const currentWinStreakIndex = markup.indexOf('id="current-win-streak"');
    const totalVpIndex = markup.indexOf('id="total-vp"');
    const avgScoreIndex = markup.indexOf('id="avg-score"');
    const medianScoreIndex = markup.indexOf('id="median-score"');
    const winningVsLosingScoreIndex = markup.indexOf('id="winning-vs-losing-score"');
    const normalizedAvgScoreIndex = markup.indexOf('id="normalized-avg-score"');
    const normalizedMedianScoreIndex = markup.indexOf('id="normalized-median-score"');
    const winningScoreByGameSizeIndex = markup.indexOf('id="winning-score-by-game-size"');
    const scoreHistogramIndex = markup.indexOf('id="score-histogram"');
    const scoreDistributionIndex = markup.indexOf('id="score-distribution-by-player"');
    const consistencyRatingIndex = markup.indexOf('id="consistency-rating"');
    const dominanceIndexIndex = markup.indexOf('id="dominance-index"');
    const podiumRateIndex = markup.indexOf('id="podium-rate"');
    const bridesmaidIndex = markup.indexOf('id="bridesmaid"');
    const expectedVsActualWinsIndex = markup.indexOf('id="expected-vs-actual-wins"');
    const closestRivalryIndex = markup.indexOf('id="closest-rivalry"');
    const lopsidedRivalryIndex = markup.indexOf('id="lopsided-rivalry"');
    const finishBreakdownIndex = markup.indexOf('id="finish-breakdown"');
    const tierShowdownIndex = markup.indexOf('id="tier-showdown"');
    const nailBiterRecordIndex = markup.indexOf('id="nail-biter-record"');
    const clutchFactorIndex = markup.indexOf('id="clutch-factor"');
    const headToHeadMatrixIndex = markup.indexOf('id="head-to-head-matrix"');
    const kingmakerIndex = markup.indexOf('id="kingmaker"');
    const gamesOverTimeIndex = markup.indexOf('id="games-over-time"');
    const cumulativeGamesIndex = markup.indexOf('id="cumulative-games"');
    const attendanceIndex = markup.indexOf('id="player-attendance-over-time"');
    const participationRateIndex = markup.indexOf('id="participation-rate"');
    const calendarHeatmapIndex = markup.indexOf('id="calendar-heatmap"');
    const dayOfWeekPatternIndex = markup.indexOf('id="day-of-week-pattern"');
    const timeOfDayPatternIndex = markup.indexOf('id="time-of-day-pattern"');
    const averageGamesPerSessionIndex = markup.indexOf('id="average-games-per-session"');
    const mostWinsInWeekIndex = markup.indexOf('id="most-wins-in-week"');
    const mostWinsInMonthIndex = markup.indexOf('id="most-wins-in-month"');
    const playerOfMonthIndex = markup.indexOf('id="player-of-month"');
    const singleGameRecordsIndex = markup.indexOf('id="single-game-records"');
    const longestWinStreakEverIndex = markup.indexOf('id="longest-win-streak-ever"');
    const longestGapIndex = markup.indexOf('id="longest-gap-between-games"');
    const busiestRecordsIndex = markup.indexOf('id="busiest-records"');

    expect(headlineSectionIndex).toBeGreaterThan(-1);
    expect(scoringSectionIndex).toBeGreaterThan(headlineSectionIndex);
    expect(finishesSectionIndex).toBeGreaterThan(scoringSectionIndex);
    expect(headToHeadSectionIndex).toBeGreaterThan(finishesSectionIndex);
    expect(activitySectionIndex).toBeGreaterThan(headToHeadSectionIndex);
    expect(recordsSectionIndex).toBeGreaterThan(activitySectionIndex);
    expect(totalWinsIndex).toBeGreaterThan(-1);
    expect(winRateIndex).toBeGreaterThan(totalWinsIndex);
    expect(currentWinStreakIndex).toBeGreaterThan(winRateIndex);
    expect(totalVpIndex).toBeGreaterThan(currentWinStreakIndex);
    expect(avgScoreIndex).toBeGreaterThan(totalVpIndex);
    expect(medianScoreIndex).toBeGreaterThan(avgScoreIndex);
    expect(normalizedAvgScoreIndex).toBeGreaterThan(medianScoreIndex);
    expect(normalizedMedianScoreIndex).toBeGreaterThan(normalizedAvgScoreIndex);
    expect(winningVsLosingScoreIndex).toBeGreaterThan(normalizedMedianScoreIndex);
    expect(winningScoreByGameSizeIndex).toBeGreaterThan(winningVsLosingScoreIndex);
    expect(scoreHistogramIndex).toBeGreaterThan(winningScoreByGameSizeIndex);
    expect(scoreDistributionIndex).toBeGreaterThan(scoreHistogramIndex);
    expect(consistencyRatingIndex).toBeGreaterThan(scoreDistributionIndex);
    expect(dominanceIndexIndex).toBeGreaterThan(consistencyRatingIndex);
    expect(podiumRateIndex).toBeGreaterThan(dominanceIndexIndex);
    expect(bridesmaidIndex).toBeGreaterThan(podiumRateIndex);
    expect(expectedVsActualWinsIndex).toBeGreaterThan(bridesmaidIndex);
    expect(finishBreakdownIndex).toBeGreaterThan(expectedVsActualWinsIndex);
    expect(tierShowdownIndex).toBeGreaterThan(finishBreakdownIndex);
    expect(nailBiterRecordIndex).toBeGreaterThan(tierShowdownIndex);
    expect(clutchFactorIndex).toBeGreaterThan(nailBiterRecordIndex);
    expect(closestRivalryIndex).toBeGreaterThan(clutchFactorIndex);
    expect(lopsidedRivalryIndex).toBeGreaterThan(closestRivalryIndex);
    expect(headToHeadMatrixIndex).toBeGreaterThan(lopsidedRivalryIndex);
    expect(kingmakerIndex).toBeGreaterThan(headToHeadMatrixIndex);
    expect(gamesOverTimeIndex).toBeGreaterThan(kingmakerIndex);
    expect(cumulativeGamesIndex).toBeGreaterThan(gamesOverTimeIndex);
    expect(attendanceIndex).toBeGreaterThan(cumulativeGamesIndex);
    expect(participationRateIndex).toBeGreaterThan(attendanceIndex);
    expect(calendarHeatmapIndex).toBeGreaterThan(participationRateIndex);
    expect(dayOfWeekPatternIndex).toBeGreaterThan(calendarHeatmapIndex);
    expect(timeOfDayPatternIndex).toBeGreaterThan(dayOfWeekPatternIndex);
    expect(averageGamesPerSessionIndex).toBeGreaterThan(timeOfDayPatternIndex);
    expect(mostWinsInWeekIndex).toBeGreaterThan(averageGamesPerSessionIndex);
    expect(mostWinsInMonthIndex).toBeGreaterThan(mostWinsInWeekIndex);
    expect(playerOfMonthIndex).toBeGreaterThan(mostWinsInMonthIndex);
    expect(singleGameRecordsIndex).toBeGreaterThan(playerOfMonthIndex);
    expect(longestWinStreakEverIndex).toBeGreaterThan(singleGameRecordsIndex);
    expect(longestGapIndex).toBeGreaterThan(longestWinStreakEverIndex);
    expect(busiestRecordsIndex).toBeGreaterThan(longestGapIndex);

    expect(markup).toContain('Headline');
    expect(markup).toContain('Top-line standings.');
    expect(markup).toContain('Scoring');
    expect(markup).toContain('How players score.');
    expect(markup).toContain('Finishes &amp; Tiers');
    expect(markup).toContain('Where players land.');
    expect(markup).toContain('Head-to-Head');
    expect(markup).toContain('Rivalries and matchups.');
    expect(markup).toContain('Activity &amp; Trends');
    expect(markup).toContain('When games happen.');
    expect(markup).toContain('Records &amp; Streaks');
    expect(markup).toContain('Personal bests and milestones.');
    expect(markup).toContain('Finish Breakdown');
    expect(markup).toContain('Player of the Month');
    expect(markup).toContain('Bridesmaid');
    expect(markup).toContain('>1st<');
    expect(markup).toContain('>2nd<');
    expect(markup).toContain('>3rd<');
    expect(markup).toContain('>Last<');
    expect(markup).toContain('Tier Showdown');
    expect(markup).toContain('>Tier<');
    expect(markup).toContain('>Appearances<');
    expect(markup).toContain('>Players<');
    expect(markup).toContain('Expected vs Actual Wins');
    expect(markup).toContain('Consistency Rating');
    expect(markup).toContain('Dominance Index');
    expect(markup).toContain('Nail-Biter Record');
    expect(markup).toContain('Clutch Factor');
    expect(markup).toContain('Kingmaker');
    expect(markup).toContain('Head-to-Head Matrix');
    expect(markup).toContain('Closest Rivalry');
    expect(markup).toContain('Most Lopsided Rivalry');
    expect(markup).toContain('Winning vs Losing Score');
    expect(markup).toContain('Winning Score by Game Size');
    expect(markup).toContain('Score Histogram');
    expect(markup).toContain('Score Distribution by Player');
    expect(markup).toContain('Average Score');
    expect(markup).toContain('Total VP');
    expect(markup).not.toContain('Points per Game');
    expect(markup).not.toContain('id="points-per-game"');
    expect(markup).toContain('Normalized Average Score');
    expect(markup).toContain('Normalized Median Score');
    expect(markup).toContain('Winner = 100%');
    expect(markup).toContain('8.3');
    expect(markup).toContain('5.0');
    expect(markup).toContain('+3.3');
    expect(markup).toContain('6 winner rows');
    expect(markup).toContain('5 non-winner rows');
    expect(markup).toContain('sm:whitespace-nowrap');
    expect(markup).toContain('47');
    expect(markup).toContain('35');
    expect(markup).toContain('94.0%');
    expect(markup).toContain('90.0%');
    expect(markup).not.toContain('Days Since Last Game');
    expect(markup).toContain('Games Over Time');
    expect(markup).toContain('Participation Rate');
    expect(markup).toContain('Player Attendance Over Time');
    expect(markup).toContain('Cumulative Games');
    expect(markup).toContain('Calendar Heatmap');
    expect(markup).toContain('Day-of-Week Pattern');
    expect(markup).toContain('Time-of-Day Pattern');
    expect(markup).toContain('Average Games per Session');
    expect(markup).toContain('Longest Gap Between Games');
    expect(markup).toContain('Busiest Day / Week / Month Records');
    expect(markup).toContain('Current Win Streak');
    expect(markup).toContain('Most Wins in a Week');
    expect(markup).toContain('Most Wins in a Month');
    expect(markup).toContain('Single-Game Records');
    expect(markup).toContain('Longest Win Streak Ever');
    expect(markup).toContain('Highest Score');
    expect(markup).toContain('Lowest Winning Score');
    expect(markup).toContain('Biggest Blowout');
    expect(markup).toContain('Closest Game');
    expect(markup).toContain('20 points');
    expect(markup).toContain('7 points');
    expect(markup).toContain('11-point margin');
    expect(markup).toContain('0-point margin');
    expect(markup).toContain('Cara');
    const singleGameRecordsMarkup = markup.slice(singleGameRecordsIndex, longestWinStreakEverIndex);
    expect(singleGameRecordsMarkup).toContain('text-(--gold)">Ada</span>, ');
    expect(singleGameRecordsMarkup).toContain('>Bea</span>');
    expect(singleGameRecordsMarkup).not.toContain('text-(--gold)">Bea</span>');
    expect(singleGameRecordsMarkup).toContain('text-(--gold)">Eve</span>');
    expect(markup).toContain('dateTime="2026-04-22T18:00:00.000Z"');
    expect(markup).toContain('>Last Win<');
    expect(markup).toContain('>Period<');
    expect(markup).toContain('>Record<');
    expect(markup).toContain('3 wins');
    expect(markup).toContain('2 wins');
    const longestWinStreakSection = markup.slice(longestWinStreakEverIndex, longestGapIndex);
    expect(longestWinStreakSection).toContain('dateTime="2026-04-20T18:00:00.000Z"');
    expect(longestWinStreakSection).toContain('dateTime="2026-04-22T18:00:00.000Z"');
    expect(longestWinStreakSection).toContain('>...<');
    expect(longestWinStreakSection).not.toContain('6:00 PM');
    expect(markup).toContain('Loading your local-time view...');
    expect(markup).toContain('88.9%');
    expect(markup).toContain('66.7%');
    expect(markup).toContain('+1.2');
    expect(markup).toContain('-0.5');
    expect(markup).toContain('2-1');
    expect(markup).toContain('Outscored: 3/4');
    expect(markup).toContain('2 wins - 1 losses');
    expect(markup).toContain('5 wins - 0 losses');

    const bridesmaidMarkup = markup.slice(bridesmaidIndex, finishBreakdownIndex);
    expect(bridesmaidMarkup).toContain('2nd Place');
    expect(bridesmaidMarkup).toContain('50.0%');
    expect(bridesmaidMarkup.indexOf('Bea')).toBeGreaterThan(-1);
    expect(bridesmaidMarkup.indexOf('Ada')).toBeGreaterThan(-1);
    expect(bridesmaidMarkup.indexOf('Bea')).toBeLessThan(bridesmaidMarkup.indexOf('Ada'));

    const avgScoreMarkup = markup.slice(avgScoreIndex, medianScoreIndex);
    expect(avgScoreMarkup).toContain('Avg Score');
    expect(avgScoreMarkup).toContain('Total VP');
    expect(avgScoreMarkup).toContain('Games');
    expect(avgScoreMarkup).toContain('9.4');
    expect(avgScoreMarkup).toContain('8.7');
    expect(avgScoreMarkup).toContain('47');
    expect(avgScoreMarkup).toContain('35');

    expect(markup.slice(totalWinsIndex, totalWinsIndex + 160)).not.toContain('lg:col-span-2');
    expect(markup.slice(winRateIndex, winRateIndex + 160)).not.toContain('lg:col-span-2');
    expect(markup.slice(expectedVsActualWinsIndex, expectedVsActualWinsIndex + 160)).not.toContain(
      'lg:col-span-2',
    );
    expect(markup.slice(headToHeadMatrixIndex, headToHeadMatrixIndex + 160)).toContain(
      'lg:col-span-2',
    );
    expect(markup.slice(closestRivalryIndex, closestRivalryIndex + 160)).not.toContain(
      'lg:col-span-2',
    );
    expect(markup.slice(lopsidedRivalryIndex, lopsidedRivalryIndex + 160)).not.toContain(
      'lg:col-span-2',
    );
    expect(markup.slice(winningVsLosingScoreIndex, winningVsLosingScoreIndex + 160)).not.toContain(
      'lg:col-span-2',
    );
    expect(markup.slice(totalVpIndex, totalVpIndex + 160)).not.toContain('lg:col-span-2');
    expect(markup.slice(avgScoreIndex, avgScoreIndex + 160)).not.toContain('lg:col-span-2');
    expect(markup.slice(gamesOverTimeIndex, gamesOverTimeIndex + 160)).not.toContain(
      'lg:col-span-2',
    );
    expect(markup.slice(participationRateIndex, participationRateIndex + 160)).toContain(
      'lg:col-span-2',
    );
    expect(markup.slice(attendanceIndex, attendanceIndex + 160)).not.toContain('lg:col-span-2');
    expect(markup.slice(cumulativeGamesIndex, cumulativeGamesIndex + 160)).not.toContain(
      'lg:col-span-2',
    );
    expect(markup.slice(calendarHeatmapIndex, calendarHeatmapIndex + 160)).toContain(
      'lg:col-span-2',
    );
    expect(markup.slice(dayOfWeekPatternIndex, dayOfWeekPatternIndex + 160)).not.toContain(
      'lg:col-span-2',
    );
    expect(markup.slice(timeOfDayPatternIndex, timeOfDayPatternIndex + 160)).not.toContain(
      'lg:col-span-2',
    );
    expect(
      markup.slice(averageGamesPerSessionIndex, averageGamesPerSessionIndex + 160),
    ).not.toContain('lg:col-span-2');
    expect(markup.slice(longestGapIndex, longestGapIndex + 160)).not.toContain('lg:col-span-2');
    expect(markup.slice(busiestRecordsIndex, busiestRecordsIndex + 160)).not.toContain(
      'lg:col-span-2',
    );
    expect(markup.slice(averageGamesPerSessionIndex, averageGamesPerSessionIndex + 300)).toContain(
      'flex flex-col',
    );
    expect(markup.slice(averageGamesPerSessionIndex, averageGamesPerSessionIndex + 300)).toContain(
      'h-full',
    );
    expect(markup.slice(longestGapIndex, longestGapIndex + 300)).toContain('flex flex-col');
    expect(markup.slice(longestGapIndex, longestGapIndex + 300)).toContain('h-full');
    expect(markup.slice(currentWinStreakIndex, currentWinStreakIndex + 160)).not.toContain(
      'lg:col-span-2',
    );
    expect(markup.slice(mostWinsInWeekIndex, mostWinsInWeekIndex + 160)).not.toContain(
      'lg:col-span-2',
    );
    expect(markup.slice(mostWinsInMonthIndex, mostWinsInMonthIndex + 160)).not.toContain(
      'lg:col-span-2',
    );
    expect(markup.slice(singleGameRecordsIndex, singleGameRecordsIndex + 160)).not.toContain(
      'lg:col-span-2',
    );
    expect(markup.slice(longestWinStreakEverIndex, longestWinStreakEverIndex + 160)).not.toContain(
      'lg:col-span-2',
    );
    expect(
      markup.slice(winningScoreByGameSizeIndex, winningScoreByGameSizeIndex + 160),
    ).not.toContain('lg:col-span-2');
  });

  it('requires three games before showing score leaderboard rows', async () => {
    setStatsPageData({
      scoreStats: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 3,
          avgScore: 9.3,
          medianScore: 9,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          games: 2,
          avgScore: 10,
          medianScore: 10,
        },
      ],
      cumulativeScoreStats: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 3,
          totalScore: 28,
          pointsPerGame: 9.3,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          games: 2,
          totalScore: 20,
          pointsPerGame: 10,
        },
      ],
      normalizedScoreStats: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 3,
          avgScore: 0.93,
          medianScore: 0.9,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          games: 2,
          avgScore: 1,
          medianScore: 1,
        },
      ],
    });

    const element = await StatsPage({ searchParams: Promise.resolve({}) });
    const markup = renderToStaticMarkup(element);
    const avgScoreIndex = markup.indexOf('id="avg-score"');
    const medianScoreIndex = markup.indexOf('id="median-score"');
    const normalizedAvgScoreIndex = markup.indexOf('id="normalized-avg-score"');
    const normalizedMedianScoreIndex = markup.indexOf('id="normalized-median-score"');
    const winningVsLosingScoreIndex = markup.indexOf('id="winning-vs-losing-score"');

    const avgScoreMarkup = markup.slice(avgScoreIndex, medianScoreIndex);
    const medianScoreMarkup = markup.slice(medianScoreIndex, normalizedAvgScoreIndex);
    const normalizedAvgScoreMarkup = markup.slice(
      normalizedAvgScoreIndex,
      normalizedMedianScoreIndex,
    );
    const normalizedMedianScoreMarkup = markup.slice(
      normalizedMedianScoreIndex,
      winningVsLosingScoreIndex,
    );

    [
      avgScoreMarkup,
      medianScoreMarkup,
      normalizedAvgScoreMarkup,
      normalizedMedianScoreMarkup,
    ].forEach((sectionMarkup) => {
      expect(sectionMarkup).toContain('Min 3 games');
      expect(sectionMarkup).toContain('Ada');
      expect(sectionMarkup).not.toContain('Bea');
    });
    expect(markup).toContain('20');
  });

  it('shows the score threshold empty state when no score leaderboard rows qualify', async () => {
    setStatsPageData({
      scoreStats: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 2,
          avgScore: 9.5,
          medianScore: 9.5,
        },
      ],
      cumulativeScoreStats: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 2,
          totalScore: 19,
          pointsPerGame: 9.5,
        },
      ],
      normalizedScoreStats: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 2,
          avgScore: 0.95,
          medianScore: 0.95,
        },
      ],
    });

    const element = await StatsPage({ searchParams: Promise.resolve({}) });
    const markup = renderToStaticMarkup(element);

    expect(markup.match(/No players have played 3\+ games yet\./g)).toHaveLength(4);
  });

  it('renders card empty states when no stats are available', async () => {
    // The empty bundle from `emptyStatsPageData()` already models "no stats recorded"; only the
    // settings thresholds differ for this case.
    vi.mocked(getSettings).mockResolvedValue({
      winRateMinGames: 2,
      podiumRateMinGames: 5,
      statCardMinGames: 5,
    });

    const element = await StatsPage({ searchParams: Promise.resolve({}) });
    const markup = renderToStaticMarkup(element);

    expect(markup).not.toContain('All-Time Leaderboards');
    expect(markup).not.toContain('href="#total-wins"');
    expect(markup).toContain('No wins recorded yet.');
    expect(markup).toContain('No players have played 2+ games yet.');
    expect(markup).toContain('No players have played 5+ games yet.');
    expect(markup).toContain('Total VP');
    expect(markup).toContain('Average Score');
    expect(markup).not.toContain('Points per Game');
    expect(markup).not.toContain('id="points-per-game"');
    expect(markup).toContain('Winning vs Losing Score');
    expect(markup).toContain('Winning Score by Game Size');
    expect(markup).not.toContain('Days Since Last Game');
    expect(markup).toContain('Games Over Time');
    expect(markup).toContain('Participation Rate');
    expect(markup).toContain('Player Attendance Over Time');
    expect(markup).toContain('Cumulative Games');
    expect(markup).toContain('Calendar Heatmap');
    expect(markup).toContain('Day-of-Week Pattern');
    expect(markup).toContain('Time-of-Day Pattern');
    expect(markup).toContain('Average Games per Session');
    expect(markup).toContain('Longest Gap Between Games');
    expect(markup).toContain('Busiest Day / Week / Month Records');
    expect(markup).toContain('Current Win Streak');
    expect(markup).toContain('Most Wins in a Week');
    expect(markup).toContain('Most Wins in a Month');
    expect(markup).toContain('Single-Game Records');
    expect(markup).toContain('Longest Win Streak Ever');
    expect(markup).toContain('Head-to-Head Matrix');
    expect(markup).toContain('Closest Rivalry');
    expect(markup).toContain('Most Lopsided Rivalry');
    expect(markup).toContain('No players recorded yet.');
    expect(markup).toContain('No rivalries meet the minimum game threshold yet.');
    expect(markup.match(/No games recorded yet\./g)).toHaveLength(24);
  });

  it('filters the podium leaderboard using the podium threshold instead of the win-rate threshold', async () => {
    setStatsPageData({
      winRates: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 5,
          wins: 2,
          winRate: 0.4,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          games: 3,
          wins: 1,
          winRate: 1 / 3,
        },
      ],
      cumulativeScoreStats: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 5,
          totalScore: 42,
          pointsPerGame: 8.4,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          games: 0,
          totalScore: 0,
          pointsPerGame: 0,
        },
      ],
      podiumRates: [
        {
          playerId: 1,
          name: 'Ada',
          tier: PlayerTier.Premium,
          games: 5,
          podiums: 3,
          podiumRate: 0.6,
        },
        {
          playerId: 2,
          name: 'Bea',
          tier: PlayerTier.Standard,
          games: 3,
          podiums: 3,
          podiumRate: 1,
        },
      ],
    });
    vi.mocked(getSettings).mockResolvedValue({
      winRateMinGames: 2,
      podiumRateMinGames: 4,
      statCardMinGames: 2,
    });

    const element = await StatsPage({ searchParams: Promise.resolve({}) });
    const markup = renderToStaticMarkup(element);
    const podiumRateIndex = markup.indexOf('id="podium-rate"');
    const expectedVsActualWinsIndex = markup.indexOf('id="expected-vs-actual-wins"');
    const podiumSection = markup.slice(podiumRateIndex, expectedVsActualWinsIndex);

    expect(podiumSection).toContain('Min 4 games');
    expect(podiumSection).toContain('Ada');
    expect(podiumSection).not.toContain('Bea');
    expect(markup).toContain('section id="win-rate"');
    expect(markup).toContain('section id="total-vp"');
    expect(markup).toContain('section id="avg-score"');
    expect(markup).not.toContain('section id="points-per-game"');
    expect(markup).toContain('Bea');
  });
});
