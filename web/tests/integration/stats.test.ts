import { describe, expect, test, vi } from 'vitest';
import {
  getGameActivityTimestamps,
  getPlayerAttendanceEvents,
  getPlayerCumulativeScoreStats,
  getPlayerHotHandIndicators,
  getPlayerCurrentWinStreaks,
  getPlayerHeadToHeadRecords,
  getRivalryAggregates,
  getPerPlayerScoreDistributions,
  getPlayerExpectedVsActualWins,
  getPlayerFinishBreakdowns,
  getPlayerMarginStats,
  getPlayerNormalizedScoreStats,
  getPlayerPodiumRates,
  getPlayerParticipationRates,
  getPlayerScoreStats,
  getScoreHistogramBuckets,
  getPlayerStreakRecords,
  getReigningChampionSummary,
  getSingleGameRecords,
  getPlayerWinRateByGameSize,
  getPlayerWinRates,
  getRecentActivitySummary,
  getTierShowdownStats,
  getWinningScoreByGameSize,
  getWinningScoreComparison,
} from '@/lib/stats';
import { PlayerTier } from '@/lib/player-tier';
import { createTestGame, createTestPlayer } from '../helpers/db';

describe('stats integration', () => {
  test('getReigningChampionSummary returns all winners from the most recent game only', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
    const carol = await createTestPlayer({ name: 'Carol', tier: PlayerTier.Standard });

    await createTestGame({
      playedAt: new Date('2026-04-20T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
      ],
    });

    await createTestGame({
      playedAt: new Date('2026-04-21T18:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 10, isWinner: true },
        { playerId: carol.id, score: 10, isWinner: true },
        { playerId: alice.id, score: 7, isWinner: false },
      ],
    });

    await expect(getReigningChampionSummary()).resolves.toMatchObject({
      playedAt: '2026-04-21T18:00:00.000Z',
      winners: [
        {
          playerId: bob.id,
          name: 'Bob',
          tier: PlayerTier.Standard,
        },
        {
          playerId: carol.id,
          name: 'Carol',
          tier: PlayerTier.Standard,
        },
      ],
    });
  });

  test('getPlayerCurrentWinStreaks counts appearance-based streaks, keeps missed games neutral, and sorts tied leaders by most recent win', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
    const carol = await createTestPlayer({ name: 'Carol', tier: PlayerTier.Standard });
    const dana = await createTestPlayer({ name: 'Dana', tier: PlayerTier.Standard });

    await createTestGame({
      playedAt: new Date('2026-04-20T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-21T18:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 10, isWinner: true },
        { playerId: alice.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-22T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-23T18:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 10, isWinner: true },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-24T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });

    const streaks = await getPlayerCurrentWinStreaks();

    expect(streaks.map((player) => player.name)).toEqual(['Alice', 'Bob', 'Carol', 'Dana']);
    expect(streaks.find((player) => player.playerId === alice.id)).toMatchObject({
      streak: 2,
      mostRecentAppearance: '2026-04-24T18:00:00.000Z',
      mostRecentWin: '2026-04-24T18:00:00.000Z',
    });
    expect(streaks.find((player) => player.playerId === bob.id)).toMatchObject({
      streak: 2,
      mostRecentAppearance: '2026-04-23T18:00:00.000Z',
      mostRecentWin: '2026-04-23T18:00:00.000Z',
    });
    expect(streaks.find((player) => player.playerId === carol.id)).toMatchObject({
      streak: 0,
      mostRecentAppearance: '2026-04-24T18:00:00.000Z',
      mostRecentWin: null,
    });
    expect(streaks.find((player) => player.playerId === dana.id)).toMatchObject({
      streak: 0,
      mostRecentAppearance: null,
      mostRecentWin: null,
    });
  });

  test('getPlayerHotHandIndicators inspects each player last five appearances, includes zero-game players, and sorts ties by recency', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
    const carol = await createTestPlayer({ name: 'Carol', tier: PlayerTier.Standard });
    const dana = await createTestPlayer({ name: 'Dana', tier: PlayerTier.Standard });

    await createTestGame({
      playedAt: new Date('2026-04-20T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-21T18:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 10, isWinner: true },
        { playerId: alice.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-22T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-23T18:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 10, isWinner: true },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-24T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-25T18:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 10, isWinner: true },
        { playerId: alice.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-26T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
      ],
    });

    const indicators = await getPlayerHotHandIndicators();

    expect(indicators.map((player) => player.name)).toEqual(['Alice', 'Bob', 'Carol', 'Dana']);
    expect(indicators.find((player) => player.playerId === alice.id)).toMatchObject({
      gamesInLast5: 5,
      winsInLast5: 3,
      mostRecentAppearance: '2026-04-26T18:00:00.000Z',
    });
    expect(indicators.find((player) => player.playerId === bob.id)).toMatchObject({
      gamesInLast5: 5,
      winsInLast5: 3,
      mostRecentAppearance: '2026-04-26T18:00:00.000Z',
    });
    expect(indicators.find((player) => player.playerId === carol.id)).toMatchObject({
      gamesInLast5: 4,
      winsInLast5: 0,
      mostRecentAppearance: '2026-04-24T18:00:00.000Z',
    });
    expect(indicators.find((player) => player.playerId === dana.id)).toMatchObject({
      gamesInLast5: 0,
      winsInLast5: 0,
      mostRecentAppearance: null,
    });
  });

  test('getPlayerHotHandIndicators only counts up to five appearances per player', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });

    await createTestGame({
      playedAt: new Date('2026-04-20T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-21T18:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 10, isWinner: true },
        { playerId: alice.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-22T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-23T18:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 10, isWinner: true },
        { playerId: alice.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-24T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-25T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 7, isWinner: false },
      ],
    });

    const indicators = await getPlayerHotHandIndicators();

    expect(indicators.find((player) => player.playerId === alice.id)).toMatchObject({
      gamesInLast5: 5,
      winsInLast5: 3,
      mostRecentAppearance: '2026-04-25T18:00:00.000Z',
    });
  });

  test('getPlayerStreakRecords tracks appearance-based outcome streaks and global attendance streaks', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
    const carol = await createTestPlayer({ name: 'Carol', tier: PlayerTier.Standard });
    const dana = await createTestPlayer({ name: 'Dana', tier: PlayerTier.Standard });

    await createTestGame({
      playedAt: new Date('2026-04-20T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-21T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-22T18:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 10, isWinner: true },
        { playerId: alice.id, score: 8, isWinner: false },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-23T18:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 10, isWinner: true },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-24T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-25T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-26T18:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 10, isWinner: true },
        { playerId: alice.id, score: 8, isWinner: false },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });

    const records = await getPlayerStreakRecords();

    expect(records.map((player) => player.name)).toEqual(['Alice', 'Bob', 'Carol', 'Dana']);
    expect(records.find((player) => player.playerId === alice.id)).toMatchObject({
      longestWinStreak: 2,
      longestWinStreakStartedAt: '2026-04-24T18:00:00.000Z',
      longestWinStreakEndedAt: '2026-04-25T18:00:00.000Z',
      currentLossStreak: 1,
      currentLossStreakStartedAt: '2026-04-26T18:00:00.000Z',
      currentLossStreakEndedAt: '2026-04-26T18:00:00.000Z',
      longestLossStreak: 1,
      longestLossStreakStartedAt: '2026-04-26T18:00:00.000Z',
      longestLossStreakEndedAt: '2026-04-26T18:00:00.000Z',
      attendanceStreak: 3,
      attendanceStreakStartedAt: '2026-04-24T18:00:00.000Z',
      attendanceStreakEndedAt: '2026-04-26T18:00:00.000Z',
    });
    expect(records.find((player) => player.playerId === bob.id)).toMatchObject({
      longestWinStreak: 2,
      longestWinStreakStartedAt: '2026-04-22T18:00:00.000Z',
      longestWinStreakEndedAt: '2026-04-23T18:00:00.000Z',
      currentLossStreak: 0,
      currentLossStreakStartedAt: null,
      currentLossStreakEndedAt: null,
      longestLossStreak: 2,
      longestLossStreakStartedAt: '2026-04-20T18:00:00.000Z',
      longestLossStreakEndedAt: '2026-04-21T18:00:00.000Z',
      attendanceStreak: 5,
      attendanceStreakStartedAt: '2026-04-20T18:00:00.000Z',
      attendanceStreakEndedAt: '2026-04-24T18:00:00.000Z',
    });
    expect(records.find((player) => player.playerId === carol.id)).toMatchObject({
      longestWinStreak: 0,
      longestWinStreakStartedAt: null,
      longestWinStreakEndedAt: null,
      currentLossStreak: 6,
      currentLossStreakStartedAt: '2026-04-20T18:00:00.000Z',
      currentLossStreakEndedAt: '2026-04-26T18:00:00.000Z',
      longestLossStreak: 6,
      longestLossStreakStartedAt: '2026-04-20T18:00:00.000Z',
      longestLossStreakEndedAt: '2026-04-26T18:00:00.000Z',
      attendanceStreak: 5,
      attendanceStreakStartedAt: '2026-04-22T18:00:00.000Z',
      attendanceStreakEndedAt: '2026-04-26T18:00:00.000Z',
    });
    expect(records.find((player) => player.playerId === dana.id)).toMatchObject({
      longestWinStreak: 0,
      longestWinStreakStartedAt: null,
      longestWinStreakEndedAt: null,
      currentLossStreak: 0,
      currentLossStreakStartedAt: null,
      currentLossStreakEndedAt: null,
      longestLossStreak: 0,
      longestLossStreakStartedAt: null,
      longestLossStreakEndedAt: null,
      attendanceStreak: 0,
      attendanceStreakStartedAt: null,
      attendanceStreakEndedAt: null,
    });
  });

  test('getPlayerWinRates includes zero-game players and breaks win ties by win rate', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
    const carol = await createTestPlayer({ name: 'Carol', tier: PlayerTier.Standard });
    const dana = await createTestPlayer({ name: 'Dana', tier: PlayerTier.Standard });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: carol.id, score: 4, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: bob.id, score: 9, isWinner: true },
        { playerId: alice.id, score: 3, isWinner: false },
      ],
    });

    const winRates = await getPlayerWinRates();

    expect(winRates.find((player) => player.playerId === dana.id)).toMatchObject({
      playerId: dana.id,
      name: 'Dana',
      tier: PlayerTier.Standard,
      games: 0,
      wins: 0,
      winRate: 0,
    });

    expect(winRates.findIndex((player) => player.playerId === bob.id)).toBeLessThan(
      winRates.findIndex((player) => player.playerId === alice.id),
    );

    expect(winRates.find((player) => player.playerId === bob.id)).toMatchObject({
      games: 1,
      wins: 1,
      winRate: 1,
    });

    expect(winRates.find((player) => player.playerId === alice.id)).toMatchObject({
      tier: PlayerTier.Premium,
      games: 2,
      wins: 1,
      winRate: 0.5,
    });
  });

  test('getPlayerScoreStats rounds averages and medians and sorts by average score', async () => {
    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });

    await Promise.all(
      [7, 7, 7, 8].map((score) =>
        createTestGame({
          players: [{ playerId: alice.id, score, isWinner: true }],
        }),
      ),
    );

    await Promise.all(
      [6, 7, 8, 9].map((score) =>
        createTestGame({
          players: [{ playerId: bob.id, score, isWinner: true }],
        }),
      ),
    );

    const scoreStats = await getPlayerScoreStats();
    const aliceStats = scoreStats.find((player) => player.playerId === alice.id);
    const bobStats = scoreStats.find((player) => player.playerId === bob.id);

    expect(aliceStats).toMatchObject({
      games: 4,
      avgScore: 7.3,
      medianScore: 7,
    });

    expect(bobStats).toMatchObject({
      games: 4,
      avgScore: 7.5,
      medianScore: 7.5,
    });

    expect(scoreStats.findIndex((player) => player.playerId === bob.id)).toBeLessThan(
      scoreStats.findIndex((player) => player.playerId === alice.id),
    );
  });

  test('getScoreHistogramBuckets counts every recorded score and preserves the score range', async () => {
    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 5, isWinner: false },
        { playerId: bob.id, score: 8, isWinner: true },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 8, isWinner: true },
        { playerId: bob.id, score: 11, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 12, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
      ],
    });

    await expect(getScoreHistogramBuckets()).resolves.toEqual([
      { score: 5, count: 1 },
      { score: 8, count: 3 },
      { score: 11, count: 1 },
      { score: 12, count: 1 },
    ]);
  });

  test('getPerPlayerScoreDistributions computes quartiles with interpolation, excludes players with no scores, and keeps ordering stable', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
    const cara = await createTestPlayer({ name: 'Cara', tier: PlayerTier.Standard });

    await Promise.all(
      [1, 2, 3, 4].map((score) =>
        createTestGame({
          players: [{ playerId: alice.id, score, isWinner: true }],
        }),
      ),
    );

    await Promise.all(
      [7, 7, 8, 9, 12].map((score) =>
        createTestGame({
          players: [{ playerId: bob.id, score, isWinner: true }],
        }),
      ),
    );

    const distributions = await getPerPlayerScoreDistributions();

    expect(distributions.map((player) => player.name)).toEqual(['Alice', 'Bob']);
    expect(distributions.find((player) => player.playerId === cara.id)).toBeUndefined();

    expect(distributions.find((player) => player.playerId === alice.id)).toMatchObject({
      playerId: alice.id,
      name: 'Alice',
      tier: PlayerTier.Premium,
      count: 4,
      min: 1,
      q1: 1.8,
      median: 2.5,
      q3: 3.3,
      max: 4,
    });

    expect(distributions.find((player) => player.playerId === bob.id)).toMatchObject({
      playerId: bob.id,
      name: 'Bob',
      tier: PlayerTier.Standard,
      count: 5,
      min: 7,
      q1: 7,
      median: 8,
      q3: 9,
      max: 12,
    });
  });

  test('getPlayerCumulativeScoreStats returns totals, rounded points per game, zero-game players, and stable total-score ordering', async () => {
    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });
    const carol = await createTestPlayer({ name: 'Carol' });
    const dana = await createTestPlayer({ name: 'Dana' });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 12, isWinner: false },
        { playerId: carol.id, score: 8, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 9, isWinner: true },
        { playerId: bob.id, score: 7, isWinner: false },
        { playerId: carol.id, score: 23, isWinner: false },
      ],
    });

    await createTestGame({
      players: [{ playerId: bob.id, score: 0, isWinner: false }],
    });

    const cumulativeStats = await getPlayerCumulativeScoreStats();

    expect(cumulativeStats.map((player) => player.name)).toEqual(['Carol', 'Bob', 'Alice', 'Dana']);

    expect(cumulativeStats.find((player) => player.playerId === carol.id)).toMatchObject({
      games: 2,
      totalScore: 31,
      pointsPerGame: 15.5,
    });

    expect(cumulativeStats.find((player) => player.playerId === bob.id)).toMatchObject({
      games: 3,
      totalScore: 19,
      pointsPerGame: 6.3,
    });

    expect(cumulativeStats.find((player) => player.playerId === alice.id)).toMatchObject({
      games: 2,
      totalScore: 19,
      pointsPerGame: 9.5,
    });

    expect(cumulativeStats.find((player) => player.playerId === dana.id)).toMatchObject({
      games: 0,
      totalScore: 0,
      pointsPerGame: 0,
    });

    expect(cumulativeStats.findIndex((player) => player.playerId === bob.id)).toBeLessThan(
      cumulativeStats.findIndex((player) => player.playerId === alice.id),
    );
  });

  test('getPlayerHeadToHeadRecords counts shared games and head-to-head wins and losses for two-player games', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
      ],
    });

    await expect(getPlayerHeadToHeadRecords()).resolves.toEqual([
      {
        playerId: alice.id,
        playerName: 'Alice',
        playerTier: PlayerTier.Premium,
        opponentId: bob.id,
        opponentName: 'Bob',
        opponentTier: PlayerTier.Standard,
        gamesTogether: 1,
        winsAgainstOpponent: 1,
        lossesToOpponent: 0,
        timesOutscoredOpponent: 1,
        timesOutscoredByOpponent: 0,
      },
      {
        playerId: bob.id,
        playerName: 'Bob',
        playerTier: PlayerTier.Standard,
        opponentId: alice.id,
        opponentName: 'Alice',
        opponentTier: PlayerTier.Premium,
        gamesTogether: 1,
        winsAgainstOpponent: 0,
        lossesToOpponent: 1,
        timesOutscoredOpponent: 0,
        timesOutscoredByOpponent: 1,
      },
    ]);
  });

  test('getPlayerHeadToHeadRecords treats co-losers as shared games without a head-to-head winner', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
    const carol = await createTestPlayer({ name: 'Carol', tier: PlayerTier.Standard });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });

    const records = await getPlayerHeadToHeadRecords();

    expect(records).toContainEqual({
      playerId: alice.id,
      playerName: 'Alice',
      playerTier: PlayerTier.Premium,
      opponentId: bob.id,
      opponentName: 'Bob',
      opponentTier: PlayerTier.Standard,
      gamesTogether: 1,
      winsAgainstOpponent: 1,
      lossesToOpponent: 0,
      timesOutscoredOpponent: 1,
      timesOutscoredByOpponent: 0,
    });
    expect(records).toContainEqual({
      playerId: alice.id,
      playerName: 'Alice',
      playerTier: PlayerTier.Premium,
      opponentId: carol.id,
      opponentName: 'Carol',
      opponentTier: PlayerTier.Standard,
      gamesTogether: 1,
      winsAgainstOpponent: 1,
      lossesToOpponent: 0,
      timesOutscoredOpponent: 1,
      timesOutscoredByOpponent: 0,
    });
    expect(records).toContainEqual({
      playerId: bob.id,
      playerName: 'Bob',
      playerTier: PlayerTier.Standard,
      opponentId: carol.id,
      opponentName: 'Carol',
      opponentTier: PlayerTier.Standard,
      gamesTogether: 1,
      winsAgainstOpponent: 0,
      lossesToOpponent: 0,
      timesOutscoredOpponent: 1,
      timesOutscoredByOpponent: 0,
    });
    expect(records).toContainEqual({
      playerId: carol.id,
      playerName: 'Carol',
      playerTier: PlayerTier.Standard,
      opponentId: bob.id,
      opponentName: 'Bob',
      opponentTier: PlayerTier.Standard,
      gamesTogether: 1,
      winsAgainstOpponent: 0,
      lossesToOpponent: 0,
      timesOutscoredOpponent: 0,
      timesOutscoredByOpponent: 1,
    });
  });

  test('getPlayerHeadToHeadRecords excludes players with no shared games', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
    const dana = await createTestPlayer({ name: 'Dana', tier: PlayerTier.Standard });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
      ],
    });

    const records = await getPlayerHeadToHeadRecords();

    expect(records.some((record) => record.playerId === dana.id)).toBe(false);
    expect(records.some((record) => record.opponentId === dana.id)).toBe(false);
  });

  test('getPlayerHeadToHeadRecords sorts tied opponents alphabetically within each player', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
    const carol = await createTestPlayer({ name: 'Carol', tier: PlayerTier.Standard });

    await createTestGame({
      playedAt: new Date('2026-04-20T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: carol.id, score: 8, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-21T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
      ],
    });

    const aliceRecords = (await getPlayerHeadToHeadRecords()).filter(
      (record) => record.playerId === alice.id,
    );

    expect(aliceRecords.map((record) => record.opponentName)).toEqual(['Bob', 'Carol']);
    expect(aliceRecords.map((record) => record.gamesTogether)).toEqual([1, 1]);
  });

  test('getPlayerHeadToHeadRecords tracks score comparisons separately from wins and ignores tied scores', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
    const carol = await createTestPlayer({ name: 'Carol', tier: PlayerTier.Standard });

    await createTestGame({
      playedAt: new Date('2026-04-20T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
        { playerId: carol.id, score: 8, isWinner: false },
      ],
    });

    await createTestGame({
      playedAt: new Date('2026-04-21T18:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 9, isWinner: true },
        { playerId: alice.id, score: 9, isWinner: true },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });

    const records = await getPlayerHeadToHeadRecords();

    expect(records).toContainEqual({
      playerId: alice.id,
      playerName: 'Alice',
      playerTier: PlayerTier.Premium,
      opponentId: bob.id,
      opponentName: 'Bob',
      opponentTier: PlayerTier.Standard,
      gamesTogether: 2,
      winsAgainstOpponent: 1,
      lossesToOpponent: 0,
      timesOutscoredOpponent: 1,
      timesOutscoredByOpponent: 0,
    });
    expect(records).toContainEqual({
      playerId: bob.id,
      playerName: 'Bob',
      playerTier: PlayerTier.Standard,
      opponentId: alice.id,
      opponentName: 'Alice',
      opponentTier: PlayerTier.Premium,
      gamesTogether: 2,
      winsAgainstOpponent: 0,
      lossesToOpponent: 1,
      timesOutscoredOpponent: 0,
      timesOutscoredByOpponent: 1,
    });
    expect(records).toContainEqual({
      playerId: bob.id,
      playerName: 'Bob',
      playerTier: PlayerTier.Standard,
      opponentId: carol.id,
      opponentName: 'Carol',
      opponentTier: PlayerTier.Standard,
      gamesTogether: 2,
      winsAgainstOpponent: 1,
      lossesToOpponent: 0,
      timesOutscoredOpponent: 1,
      timesOutscoredByOpponent: 0,
    });
    expect(records).toContainEqual({
      playerId: carol.id,
      playerName: 'Carol',
      playerTier: PlayerTier.Standard,
      opponentId: alice.id,
      opponentName: 'Alice',
      opponentTier: PlayerTier.Premium,
      gamesTogether: 2,
      winsAgainstOpponent: 0,
      lossesToOpponent: 2,
      timesOutscoredOpponent: 0,
      timesOutscoredByOpponent: 2,
    });
  });

  describe('getRivalryAggregates', () => {
    test('deduplicates directional head-to-head rows into one pair aggregate', async () => {
      const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
      const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });

      await createTestGame({
        playedAt: new Date('2026-04-20T18:00:00.000Z'),
        players: [
          { playerId: alice.id, score: 10, isWinner: true },
          { playerId: bob.id, score: 8, isWinner: false },
        ],
      });

      await createTestGame({
        playedAt: new Date('2026-04-21T18:00:00.000Z'),
        players: [
          { playerId: bob.id, score: 10, isWinner: true },
          { playerId: alice.id, score: 7, isWinner: false },
        ],
      });

      await expect(getRivalryAggregates()).resolves.toEqual([
        {
          playerA: {
            playerId: alice.id,
            name: 'Alice',
            tier: PlayerTier.Premium,
          },
          playerB: {
            playerId: bob.id,
            name: 'Bob',
            tier: PlayerTier.Standard,
          },
          gamesTogether: 2,
          playerAWins: 1,
          playerBWins: 1,
          decidedGames: 2,
          closenessScore: 0,
        },
      ]);
    });

    test('bases closeness on decided games so tied winner flags do not bias the rivalry rate', async () => {
      const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
      const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });

      await createTestGame({
        playedAt: new Date('2026-04-20T18:00:00.000Z'),
        players: [
          { playerId: alice.id, score: 10, isWinner: true },
          { playerId: bob.id, score: 8, isWinner: false },
        ],
      });

      await createTestGame({
        playedAt: new Date('2026-04-21T18:00:00.000Z'),
        players: [
          { playerId: alice.id, score: 9, isWinner: false },
          { playerId: bob.id, score: 9, isWinner: false },
        ],
      });

      const [aggregate] = await getRivalryAggregates();

      expect(aggregate).toMatchObject({
        gamesTogether: 2,
        playerAWins: 1,
        playerBWins: 0,
        decidedGames: 1,
        closenessScore: 0.5,
      });
    });

    test('marks pairs with no decided games as ineligible so they sort last', async () => {
      const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
      const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
      const carol = await createTestPlayer({ name: 'Carol', tier: PlayerTier.Standard });
      const dana = await createTestPlayer({ name: 'Dana', tier: PlayerTier.Standard });

      await createTestGame({
        playedAt: new Date('2026-04-20T18:00:00.000Z'),
        players: [
          { playerId: alice.id, score: 9, isWinner: false },
          { playerId: bob.id, score: 9, isWinner: false },
        ],
      });

      await createTestGame({
        playedAt: new Date('2026-04-21T18:00:00.000Z'),
        players: [
          { playerId: carol.id, score: 10, isWinner: true },
          { playerId: dana.id, score: 8, isWinner: false },
        ],
      });

      const aggregates = await getRivalryAggregates();

      expect(aggregates).toHaveLength(2);
      expect(aggregates[0]).toMatchObject({
        playerA: { playerId: carol.id, name: 'Carol', tier: PlayerTier.Standard },
        playerB: { playerId: dana.id, name: 'Dana', tier: PlayerTier.Standard },
        decidedGames: 1,
        closenessScore: 0.5,
      });
      expect(aggregates[1]).toMatchObject({
        playerA: { playerId: alice.id, name: 'Alice', tier: PlayerTier.Premium },
        playerB: { playerId: bob.id, name: 'Bob', tier: PlayerTier.Standard },
        decidedGames: 0,
      });
      expect(aggregates[1]?.closenessScore).toBe(Number.POSITIVE_INFINITY);
    });
  });

  test('getPlayerNormalizedScoreStats normalizes by winning score, falls back to max score, and excludes zero-target games', async () => {
    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });
    const carol = await createTestPlayer({ name: 'Carol' });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 7, isWinner: true },
        { playerId: bob.id, score: 6, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 8, isWinner: false },
        { playerId: bob.id, score: 10, isWinner: true },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 9, isWinner: false },
        { playerId: bob.id, score: 7, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 0, isWinner: true },
        { playerId: carol.id, score: 0, isWinner: false },
      ],
    });

    const normalizedStats = await getPlayerNormalizedScoreStats();
    const aliceStats = normalizedStats.find((player) => player.playerId === alice.id);
    const bobStats = normalizedStats.find((player) => player.playerId === bob.id);
    const carolStats = normalizedStats.find((player) => player.playerId === carol.id);

    expect(aliceStats).toMatchObject({
      games: 3,
      avgScore: 0.933,
      medianScore: 1,
    });

    expect(bobStats).toMatchObject({
      games: 3,
      avgScore: 0.878,
      medianScore: 0.857,
    });

    expect(carolStats).toBeUndefined();

    expect(normalizedStats.findIndex((player) => player.playerId === alice.id)).toBeLessThan(
      normalizedStats.findIndex((player) => player.playerId === bob.id),
    );
  });

  test('getWinningScoreComparison compares winner-equivalent rows against non-winner rows', async () => {
    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });
    const carol = await createTestPlayer({ name: 'Carol' });
    const dana = await createTestPlayer({ name: 'Dana' });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
        { playerId: carol.id, score: 6, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 11, isWinner: true },
        { playerId: bob.id, score: 11, isWinner: true },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: bob.id, score: 9, isWinner: false },
        { playerId: carol.id, score: 9, isWinner: false },
        { playerId: dana.id, score: 4, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 0, isWinner: true },
        { playerId: dana.id, score: 0, isWinner: false },
      ],
    });

    await expect(getWinningScoreComparison()).resolves.toEqual({
      winnerRows: 6,
      nonWinnerRows: 5,
      avgWinningScore: 8.3,
      avgLosingScore: 5,
      scoreGap: 3.3,
    });
  });

  test('getPlayerPodiumRates counts tied finish ranks and breaks equal rates by podium count', async () => {
    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });
    const carol = await createTestPlayer({ name: 'Carol' });
    const dana = await createTestPlayer({ name: 'Dana' });
    const eve = await createTestPlayer({ name: 'Eve' });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 10, isWinner: true },
        { playerId: carol.id, score: 5, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 9, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
        { playerId: carol.id, score: 8, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 7, isWinner: true },
        { playerId: dana.id, score: 1, isWinner: false },
      ],
    });

    const podiumRates = await getPlayerPodiumRates();
    const positions = new Map(podiumRates.map((player, index) => [player.playerId, index]));

    expect(podiumRates.find((player) => player.playerId === alice.id)).toMatchObject({
      games: 3,
      podiums: 3,
      podiumRate: 1,
    });

    expect(podiumRates.find((player) => player.playerId === bob.id)).toMatchObject({
      games: 2,
      podiums: 2,
      podiumRate: 1,
    });

    expect(podiumRates.find((player) => player.playerId === carol.id)).toMatchObject({
      games: 2,
      podiums: 1,
      podiumRate: 0.5,
    });

    expect(podiumRates.find((player) => player.playerId === eve.id)).toMatchObject({
      games: 0,
      podiums: 0,
      podiumRate: 0,
    });

    expect(positions.get(alice.id)).toBeLessThan(positions.get(bob.id)!);
    expect(positions.get(bob.id)).toBeLessThan(positions.get(dana.id)!);
    expect(positions.get(dana.id)).toBeLessThan(positions.get(carol.id)!);
    expect(positions.get(carol.id)).toBeLessThan(positions.get(eve.id)!);
  });

  test('getPlayerFinishBreakdowns includes zero-game players and counts shared places with overlapping last-place stats', async () => {
    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });
    const carol = await createTestPlayer({ name: 'Carol' });
    const dana = await createTestPlayer({ name: 'Dana' });
    const eve = await createTestPlayer({ name: 'Eve' });
    const frank = await createTestPlayer({ name: 'Frank' });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
        { playerId: carol.id, score: 8, isWinner: false },
        { playerId: dana.id, score: 1, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 9, isWinner: true },
        { playerId: bob.id, score: 5, isWinner: false },
        { playerId: carol.id, score: 5, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: bob.id, score: 7, isWinner: true },
        { playerId: dana.id, score: 1, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 10, isWinner: true },
        { playerId: eve.id, score: 10, isWinner: true },
        { playerId: carol.id, score: 4, isWinner: false },
      ],
    });

    const finishBreakdowns = await getPlayerFinishBreakdowns();
    const positions = new Map(finishBreakdowns.map((player, index) => [player.playerId, index]));

    expect(finishBreakdowns.find((player) => player.playerId === alice.id)).toMatchObject({
      games: 3,
      firsts: 3,
      seconds: 0,
      thirds: 0,
      lasts: 0,
      firstRate: 1,
      secondRate: 0,
      thirdRate: 0,
      lastRate: 0,
    });

    expect(finishBreakdowns.find((player) => player.playerId === bob.id)).toMatchObject({
      games: 4,
      firsts: 2,
      seconds: 2,
      thirds: 0,
      lasts: 1,
      firstRate: 0.5,
      secondRate: 0.5,
      thirdRate: 0,
      lastRate: 0.25,
    });

    expect(finishBreakdowns.find((player) => player.playerId === carol.id)).toMatchObject({
      games: 3,
      firsts: 0,
      seconds: 2,
      thirds: 0,
      lasts: 2,
      firstRate: 0,
      secondRate: 2 / 3,
      thirdRate: 0,
      lastRate: 2 / 3,
    });

    expect(finishBreakdowns.find((player) => player.playerId === dana.id)).toMatchObject({
      games: 2,
      firsts: 0,
      seconds: 1,
      thirds: 0,
      lasts: 2,
      firstRate: 0,
      secondRate: 0.5,
      thirdRate: 0,
      lastRate: 1,
    });

    expect(finishBreakdowns.find((player) => player.playerId === eve.id)).toMatchObject({
      games: 1,
      firsts: 1,
      seconds: 0,
      thirds: 0,
      lasts: 0,
      firstRate: 1,
      secondRate: 0,
      thirdRate: 0,
      lastRate: 0,
    });

    expect(finishBreakdowns.find((player) => player.playerId === frank.id)).toMatchObject({
      games: 0,
      firsts: 0,
      seconds: 0,
      thirds: 0,
      lasts: 0,
      firstRate: 0,
      secondRate: 0,
      thirdRate: 0,
      lastRate: 0,
    });

    expect(positions.get(alice.id)).toBeLessThan(positions.get(eve.id)!);
    expect(positions.get(eve.id)).toBeLessThan(positions.get(bob.id)!);
    expect(positions.get(bob.id)).toBeLessThan(positions.get(carol.id)!);
    expect(positions.get(carol.id)).toBeLessThan(positions.get(dana.id)!);
    expect(positions.get(dana.id)).toBeLessThan(positions.get(frank.id)!);
  });

  test('getPlayerMarginStats uses recorded winners only and excludes tied-top games with no winner', async () => {
    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });
    const carol = await createTestPlayer({ name: 'Carol' });
    const dana = await createTestPlayer({ name: 'Dana' });
    const eve = await createTestPlayer({ name: 'Eve' });
    const frank = await createTestPlayer({ name: 'Frank' });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 7, isWinner: false },
        { playerId: carol.id, score: 5, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 9, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
        { playerId: dana.id, score: 8, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: bob.id, score: 11, isWinner: true },
        { playerId: alice.id, score: 10, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 10, isWinner: false },
        { playerId: bob.id, score: 10, isWinner: false },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: dana.id, score: 9, isWinner: true },
        { playerId: eve.id, score: 9, isWinner: true },
      ],
    });

    const marginStats = await getPlayerMarginStats();

    expect(marginStats.find((player) => player.playerId === alice.id)).toMatchObject({
      winGames: 2,
      lossGames: 1,
      averageVictoryMargin: 2,
      averageDefeatMargin: 1,
    });

    expect(marginStats.find((player) => player.playerId === bob.id)).toMatchObject({
      winGames: 1,
      lossGames: 2,
      averageVictoryMargin: 1,
      averageDefeatMargin: 2,
    });

    expect(marginStats.find((player) => player.playerId === carol.id)).toMatchObject({
      winGames: 0,
      lossGames: 1,
      averageVictoryMargin: null,
      averageDefeatMargin: 5,
    });

    expect(marginStats.find((player) => player.playerId === dana.id)).toMatchObject({
      winGames: 1,
      lossGames: 1,
      averageVictoryMargin: 0,
      averageDefeatMargin: 1,
    });

    expect(marginStats.find((player) => player.playerId === eve.id)).toMatchObject({
      winGames: 1,
      lossGames: 0,
      averageVictoryMargin: 0,
      averageDefeatMargin: null,
    });

    expect(marginStats.find((player) => player.playerId === frank.id)).toMatchObject({
      winGames: 0,
      lossGames: 0,
      averageVictoryMargin: null,
      averageDefeatMargin: null,
    });
  });

  test('getSingleGameRecords returns highest score, lowest winning score, biggest blowout, and closest game', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
    const carol = await createTestPlayer({ name: 'Carol', tier: PlayerTier.Standard });
    const dana = await createTestPlayer({ name: 'Dana', tier: PlayerTier.Standard });
    const eve = await createTestPlayer({ name: 'Eve', tier: PlayerTier.Premium });

    await createTestGame({
      playedAt: new Date('2026-04-20T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 12, isWinner: true },
        { playerId: bob.id, score: 10, isWinner: false },
        { playerId: carol.id, score: 8, isWinner: false },
      ],
    });

    await createTestGame({
      playedAt: new Date('2026-04-21T18:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 9, isWinner: true },
        { playerId: alice.id, score: 8, isWinner: false },
        { playerId: carol.id, score: 7, isWinner: false },
      ],
    });

    const highScoreLoss = await createTestGame({
      playedAt: new Date('2026-04-22T18:00:00.000Z'),
      players: [
        { playerId: carol.id, score: 20, isWinner: false },
        { playerId: dana.id, score: 11, isWinner: true },
        { playerId: bob.id, score: 10, isWinner: false },
      ],
    });

    const closestTie = await createTestGame({
      playedAt: new Date('2026-04-23T18:00:00.000Z'),
      players: [
        { playerId: eve.id, score: 7, isWinner: true },
        { playerId: bob.id, score: 7, isWinner: false },
        { playerId: carol.id, score: 4, isWinner: false },
      ],
    });

    await createTestGame({
      playedAt: new Date('2026-04-24T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 6, isWinner: false },
        { playerId: bob.id, score: 6, isWinner: false },
      ],
    });

    const blowout = await createTestGame({
      playedAt: new Date('2026-04-25T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 15, isWinner: true },
        { playerId: eve.id, score: 15, isWinner: true },
        { playerId: dana.id, score: 4, isWinner: false },
      ],
    });

    await expect(getSingleGameRecords()).resolves.toEqual({
      highestScore: {
        gameId: highScoreLoss.id,
        playedAt: '2026-04-22T18:00:00.000Z',
        playerId: carol.id,
        name: 'Carol',
        tier: PlayerTier.Standard,
        score: 20,
      },
      lowestWinningScore: {
        gameId: closestTie.id,
        playedAt: '2026-04-23T18:00:00.000Z',
        playerId: eve.id,
        name: 'Eve',
        tier: PlayerTier.Premium,
        score: 7,
      },
      biggestBlowout: {
        gameId: blowout.id,
        playedAt: '2026-04-25T18:00:00.000Z',
        winner: 'Alice, Eve',
        winnerScore: 15,
        runnerUpScore: 4,
        margin: 11,
        participantCount: 3,
      },
      closestGame: {
        gameId: closestTie.id,
        playedAt: '2026-04-23T18:00:00.000Z',
        winner: 'Eve',
        winnerScore: 7,
        runnerUpScore: 7,
        margin: 0,
        participantCount: 3,
      },
    });
  });

  test('game-size aggregates drive opponent-count win rates, tier showdown, and expected wins', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
    const carol = await createTestPlayer({ name: 'Carol', tier: PlayerTier.Standard });
    const dana = await createTestPlayer({ name: 'Dana', tier: PlayerTier.Premium });
    const eve = await createTestPlayer({ name: 'Eve', tier: PlayerTier.Standard });
    const frank = await createTestPlayer({ name: 'Frank', tier: PlayerTier.Standard });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 7, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: bob.id, score: 11, isWinner: true },
        { playerId: alice.id, score: 8, isWinner: false },
        { playerId: carol.id, score: 6, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 12, isWinner: true },
        { playerId: dana.id, score: 12, isWinner: true },
        { playerId: bob.id, score: 9, isWinner: false },
        { playerId: carol.id, score: 8, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: carol.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
        { playerId: dana.id, score: 7, isWinner: false },
        { playerId: eve.id, score: 6, isWinner: false },
      ],
    });

    const [winRateByGameSize, expectedVsActualWins, tierShowdown] = await Promise.all([
      getPlayerWinRateByGameSize(),
      getPlayerExpectedVsActualWins(),
      getTierShowdownStats(),
    ]);

    expect(winRateByGameSize.filter((player) => player.playerId === alice.id)).toEqual([
      expect.objectContaining({
        playerCount: 2,
        games: 1,
        wins: 1,
        winRate: 1,
      }),
      expect.objectContaining({
        playerCount: 3,
        games: 1,
        wins: 0,
        winRate: 0,
      }),
      expect.objectContaining({
        playerCount: 4,
        games: 1,
        wins: 1,
        winRate: 1,
      }),
    ]);

    expect(winRateByGameSize.filter((player) => player.playerId === bob.id)).toEqual([
      expect.objectContaining({
        playerCount: 2,
        games: 1,
        wins: 0,
        winRate: 0,
      }),
      expect.objectContaining({
        playerCount: 3,
        games: 1,
        wins: 1,
        winRate: 1,
      }),
      expect.objectContaining({
        playerCount: 4,
        games: 2,
        wins: 0,
        winRate: 0,
      }),
    ]);

    expect(expectedVsActualWins.find((player) => player.playerId === alice.id)).toMatchObject({
      games: 3,
      wins: 2,
      expectedWins: 1.1,
      winDelta: 0.9,
    });

    expect(expectedVsActualWins.find((player) => player.playerId === dana.id)).toMatchObject({
      games: 2,
      wins: 1,
      expectedWins: 0.5,
      winDelta: 0.5,
    });

    expect(expectedVsActualWins.find((player) => player.playerId === bob.id)).toMatchObject({
      games: 4,
      wins: 1,
      expectedWins: 1.3,
      winDelta: -0.3,
    });

    expect(expectedVsActualWins.find((player) => player.playerId === eve.id)).toMatchObject({
      games: 1,
      wins: 0,
      expectedWins: 0.3,
      winDelta: -0.2,
    });

    expect(expectedVsActualWins.find((player) => player.playerId === frank.id)).toMatchObject({
      games: 0,
      wins: 0,
      expectedWins: 0,
      winDelta: 0,
    });

    expect(expectedVsActualWins.findIndex((player) => player.playerId === eve.id)).toBeLessThan(
      expectedVsActualWins.findIndex((player) => player.playerId === bob.id),
    );

    expect(tierShowdown).toEqual([
      expect.objectContaining({
        tier: PlayerTier.Premium,
        players: 2,
        appearances: 5,
        wins: 3,
        winRate: 0.6,
      }),
      expect.objectContaining({
        tier: PlayerTier.Standard,
        players: 4,
        appearances: 8,
        wins: 2,
        winRate: 0.25,
      }),
    ]);
  });

  test('getWinningScoreByGameSize buckets average winning score per game size with fallback winners', async () => {
    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });
    const carol = await createTestPlayer({ name: 'Carol' });
    const dana = await createTestPlayer({ name: 'Dana' });
    const eve = await createTestPlayer({ name: 'Eve' });
    const frank = await createTestPlayer({ name: 'Frank' });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 7, isWinner: false },
        { playerId: carol.id, score: 6, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: bob.id, score: 8, isWinner: false },
        { playerId: carol.id, score: 8, isWinner: false },
        { playerId: dana.id, score: 4, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 12, isWinner: true },
        { playerId: bob.id, score: 9, isWinner: false },
        { playerId: carol.id, score: 7, isWinner: false },
        { playerId: dana.id, score: 5, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 15, isWinner: true },
        { playerId: eve.id, score: 15, isWinner: true },
        { playerId: bob.id, score: 11, isWinner: false },
        { playerId: carol.id, score: 10, isWinner: false },
        { playerId: dana.id, score: 8, isWinner: false },
      ],
    });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 0, isWinner: true },
        { playerId: bob.id, score: 0, isWinner: false },
        { playerId: carol.id, score: 0, isWinner: false },
        { playerId: dana.id, score: 0, isWinner: false },
        { playerId: eve.id, score: 0, isWinner: false },
        { playerId: frank.id, score: 0, isWinner: false },
      ],
    });

    await expect(getWinningScoreByGameSize()).resolves.toEqual([
      {
        playerCount: 3,
        gameCount: 2,
        avgWinningScore: 9,
      },
      {
        playerCount: 4,
        gameCount: 1,
        avgWinningScore: 12,
      },
      {
        playerCount: 5,
        gameCount: 1,
        avgWinningScore: 15,
      },
      {
        playerCount: 6,
        gameCount: 1,
        avgWinningScore: 0,
      },
    ]);
  });

  test('getRecentActivitySummary returns null activity when no games exist', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-21T12:00:00.000Z').getTime());

    await createTestPlayer({ name: 'Alice' });

    await expect(getRecentActivitySummary()).resolves.toEqual({
      totalGames: 0,
      latestPlayedAt: null,
    });
  });

  test('getRecentActivitySummary returns the latest timestamp without server-computed day math', async () => {
    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });

    await createTestGame({
      playedAt: new Date('2026-04-21T00:05:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 8, isWinner: false },
      ],
    });

    const summary = await getRecentActivitySummary();

    expect(summary.totalGames).toBe(1);
    expect(summary.latestPlayedAt).toBe('2026-04-21T00:05:00.000Z');
  });

  test('getGameActivityTimestamps returns ascending iso timestamps', async () => {
    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });

    await createTestGame({
      playedAt: new Date('2026-04-18T23:59:59.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 7, isWinner: false },
      ],
    });

    await createTestGame({
      playedAt: new Date('2026-04-21T00:05:00.000Z'),
      players: [
        { playerId: bob.id, score: 10, isWinner: true },
        { playerId: alice.id, score: 8, isWinner: false },
      ],
    });

    await expect(getGameActivityTimestamps()).resolves.toEqual([
      '2026-04-18T23:59:59.000Z',
      '2026-04-21T00:05:00.000Z',
    ]);
  });

  test('getPlayerAttendanceEvents returns ordered raw attendance rows with parsed tiers', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });

    await createTestGame({
      playedAt: new Date('2026-04-21T00:05:00.000Z'),
      players: [
        { playerId: bob.id, score: 10, isWinner: true },
        { playerId: alice.id, score: 8, isWinner: false },
      ],
    });

    await expect(getPlayerAttendanceEvents()).resolves.toEqual([
      {
        playedAt: '2026-04-21T00:05:00.000Z',
        playerId: alice.id,
        name: 'Alice',
        tier: PlayerTier.Premium,
      },
      {
        playedAt: '2026-04-21T00:05:00.000Z',
        playerId: bob.id,
        name: 'Bob',
        tier: PlayerTier.Standard,
      },
    ]);
  });

  test('new activity stats return empty structures when no games exist', async () => {
    await createTestPlayer({ name: 'Alice' });

    await expect(getGameActivityTimestamps()).resolves.toEqual([]);
    await expect(getPlayerAttendanceEvents()).resolves.toEqual([]);
  });

  test('getPlayerParticipationRates includes zero-game players and sorts ties by player name', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
    const carol = await createTestPlayer({ name: 'Carol', tier: PlayerTier.Standard });
    const dana = await createTestPlayer({ name: 'Dana', tier: PlayerTier.Standard });

    await createTestGame({
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 6, isWinner: false },
      ],
    });
    await createTestGame({
      players: [
        { playerId: alice.id, score: 8, isWinner: true },
        { playerId: carol.id, score: 5, isWinner: false },
      ],
    });
    await createTestGame({
      players: [{ playerId: alice.id, score: 9, isWinner: true }],
    });
    await createTestGame({
      players: [
        { playerId: bob.id, score: 7, isWinner: true },
        { playerId: carol.id, score: 4, isWinner: false },
      ],
    });

    const participationRates = await getPlayerParticipationRates();

    expect(participationRates.map((player) => player.name)).toEqual([
      'Alice',
      'Bob',
      'Carol',
      'Dana',
    ]);
    expect(participationRates.find((player) => player.playerId === alice.id)).toMatchObject({
      tier: PlayerTier.Premium,
      gamesPlayed: 3,
      totalGames: 4,
      participationRate: 0.75,
    });
    expect(participationRates.find((player) => player.playerId === bob.id)).toMatchObject({
      gamesPlayed: 2,
      totalGames: 4,
      participationRate: 0.5,
    });
    expect(participationRates.find((player) => player.playerId === carol.id)).toMatchObject({
      gamesPlayed: 2,
      totalGames: 4,
      participationRate: 0.5,
    });
    expect(participationRates.find((player) => player.playerId === dana.id)).toMatchObject({
      gamesPlayed: 0,
      totalGames: 4,
      participationRate: 0,
    });
  });
});
