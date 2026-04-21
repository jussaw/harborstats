import { describe, expect, test, vi } from 'vitest';
import {
  getCalendarHeatmapData,
  getGamesOverTimeSeries,
  getPlayerAttendanceSeries,
  getPlayerExpectedVsActualWins,
  getPlayerFinishBreakdowns,
  getPlayerMarginStats,
  getPlayerPodiumRates,
  getPlayerParticipationRates,
  getPlayerScoreStats,
  getPlayerWinRateByGameSize,
  getPlayerWinRates,
  getRecentActivitySummary,
  getTierShowdownStats,
} from '@/lib/stats';
import { PlayerTier } from '@/lib/player-tier';
import { createTestGame, createTestPlayer } from '../helpers/db';

describe('stats integration', () => {
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

    await Promise.all([7, 7, 7, 8].map((score) => createTestGame({
        players: [{ playerId: alice.id, score, isWinner: true }],
      })));

    await Promise.all([6, 7, 8, 9].map((score) => createTestGame({
        players: [{ playerId: bob.id, score, isWinner: true }],
      })));

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

  test('getRecentActivitySummary returns null activity when no games exist', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-21T12:00:00.000Z').getTime());

    await createTestPlayer({ name: 'Alice' });

    await expect(getRecentActivitySummary()).resolves.toEqual({
      totalGames: 0,
      latestPlayedAt: null,
      daysSinceLastGame: null,
    });
  });

  test('getRecentActivitySummary uses UTC calendar days and reports zero for same-day games', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-21T23:59:59.000Z').getTime());

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
    expect(summary.latestPlayedAt?.toISOString()).toBe('2026-04-21T00:05:00.000Z');
    expect(summary.daysSinceLastGame).toBe(0);
  });

  test('getRecentActivitySummary counts multi-day gaps using UTC dates', async () => {
    vi.spyOn(Date, 'now').mockReturnValue(new Date('2026-04-21T01:00:00.000Z').getTime());

    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });

    await createTestGame({
      playedAt: new Date('2026-04-18T23:59:59.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 7, isWinner: false },
      ],
    });

    const summary = await getRecentActivitySummary();

    expect(summary.totalGames).toBe(1);
    expect(summary.latestPlayedAt?.toISOString()).toBe('2026-04-18T23:59:59.000Z');
    expect(summary.daysSinceLastGame).toBe(3);
  });

  test('getGamesOverTimeSeries returns weekly and monthly buckets with zero-filled gaps', async () => {
    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });

    await createTestGame({
      playedAt: new Date('2026-01-05T12:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-01-06T12:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 11, isWinner: true },
        { playerId: alice.id, score: 8, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-01-20T12:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 9, isWinner: true },
        { playerId: bob.id, score: 4, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-03-02T12:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 9, isWinner: true },
        { playerId: alice.id, score: 6, isWinner: false },
      ],
    });

    const series = await getGamesOverTimeSeries();

    expect(series.totalGames).toBe(4);
    expect(series.weekly.map((bucket) => ({
      bucketStart: bucket.bucketStart.toISOString().slice(0, 10),
      gameCount: bucket.gameCount,
    }))).toEqual([
      { bucketStart: '2026-01-05', gameCount: 2 },
      { bucketStart: '2026-01-12', gameCount: 0 },
      { bucketStart: '2026-01-19', gameCount: 1 },
      { bucketStart: '2026-01-26', gameCount: 0 },
      { bucketStart: '2026-02-02', gameCount: 0 },
      { bucketStart: '2026-02-09', gameCount: 0 },
      { bucketStart: '2026-02-16', gameCount: 0 },
      { bucketStart: '2026-02-23', gameCount: 0 },
      { bucketStart: '2026-03-02', gameCount: 1 },
    ]);
    expect(series.monthly.map((bucket) => ({
      bucketStart: bucket.bucketStart.toISOString().slice(0, 10),
      gameCount: bucket.gameCount,
    }))).toEqual([
      { bucketStart: '2026-01-01', gameCount: 3 },
      { bucketStart: '2026-02-01', gameCount: 0 },
      { bucketStart: '2026-03-01', gameCount: 1 },
    ]);
    expect(series.weekly.every((bucket) => bucket.label.length > 0)).toBe(true);
    expect(series.monthly.every((bucket) => bucket.label.length > 0)).toBe(true);
  });

  test('getPlayerAttendanceSeries counts per-player appearances and zero-fills bucket gaps', async () => {
    const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
    const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
    const carol = await createTestPlayer({ name: 'Carol', tier: PlayerTier.Standard });

    await createTestGame({
      playedAt: new Date('2026-01-05T12:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-01-06T12:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 11, isWinner: true },
        { playerId: carol.id, score: 8, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-01-20T12:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 9, isWinner: true },
        { playerId: carol.id, score: 4, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-03-02T12:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 9, isWinner: true },
      ],
    });

    const series = await getPlayerAttendanceSeries();

    expect(series.weekly.map((bucket) => ({
      bucketStart: bucket.bucketStart.toISOString().slice(0, 10),
      totalAppearances: bucket.totalAppearances,
      segments: bucket.segments.map((segment) => ({
        name: segment.name,
        tier: segment.tier,
        gameCount: segment.gameCount,
      })),
    }))).toEqual([
      {
        bucketStart: '2026-01-05',
        totalAppearances: 4,
        segments: [
          { name: 'Alice', tier: PlayerTier.Premium, gameCount: 2 },
          { name: 'Bob', tier: PlayerTier.Standard, gameCount: 1 },
          { name: 'Carol', tier: PlayerTier.Standard, gameCount: 1 },
        ],
      },
      {
        bucketStart: '2026-01-12',
        totalAppearances: 0,
        segments: [],
      },
      {
        bucketStart: '2026-01-19',
        totalAppearances: 2,
        segments: [
          { name: 'Bob', tier: PlayerTier.Standard, gameCount: 1 },
          { name: 'Carol', tier: PlayerTier.Standard, gameCount: 1 },
        ],
      },
      {
        bucketStart: '2026-01-26',
        totalAppearances: 0,
        segments: [],
      },
      {
        bucketStart: '2026-02-02',
        totalAppearances: 0,
        segments: [],
      },
      {
        bucketStart: '2026-02-09',
        totalAppearances: 0,
        segments: [],
      },
      {
        bucketStart: '2026-02-16',
        totalAppearances: 0,
        segments: [],
      },
      {
        bucketStart: '2026-02-23',
        totalAppearances: 0,
        segments: [],
      },
      {
        bucketStart: '2026-03-02',
        totalAppearances: 1,
        segments: [{ name: 'Alice', tier: PlayerTier.Premium, gameCount: 1 }],
      },
    ]);

    expect(series.monthly.map((bucket) => ({
      bucketStart: bucket.bucketStart.toISOString().slice(0, 10),
      totalAppearances: bucket.totalAppearances,
      segments: bucket.segments.map((segment) => ({
        name: segment.name,
        gameCount: segment.gameCount,
      })),
    }))).toEqual([
      {
        bucketStart: '2026-01-01',
        totalAppearances: 6,
        segments: [
          { name: 'Alice', gameCount: 2 },
          { name: 'Bob', gameCount: 2 },
          { name: 'Carol', gameCount: 2 },
        ],
      },
      {
        bucketStart: '2026-02-01',
        totalAppearances: 0,
        segments: [],
      },
      {
        bucketStart: '2026-03-01',
        totalAppearances: 1,
        segments: [{ name: 'Alice', gameCount: 1 }],
      },
    ]);
  });

  test('getCalendarHeatmapData builds recent and yearly UTC day grids', async () => {
    const alice = await createTestPlayer({ name: 'Alice' });
    const bob = await createTestPlayer({ name: 'Bob' });

    await createTestGame({
      playedAt: new Date('2025-04-22T12:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 10, isWinner: true },
        { playerId: bob.id, score: 7, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2025-12-31T22:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 11, isWinner: true },
        { playerId: alice.id, score: 8, isWinner: false },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-20T18:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 9, isWinner: true },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-21T03:00:00.000Z'),
      players: [
        { playerId: bob.id, score: 9, isWinner: true },
      ],
    });
    await createTestGame({
      playedAt: new Date('2026-04-21T21:00:00.000Z'),
      players: [
        { playerId: alice.id, score: 12, isWinner: true },
      ],
    });

    const heatmap = await getCalendarHeatmapData();

    expect(heatmap.defaultYear).toBe(2026);
    expect(heatmap.years.map((year) => year.year)).toEqual([2026, 2025]);
    expect(heatmap.years.find((year) => year.year === 2026)).toMatchObject({
      totalGames: 3,
    });
    expect(heatmap.years.find((year) => year.year === 2025)).toMatchObject({
      totalGames: 2,
    });

    expect(heatmap.years.find((year) => year.year === 2026)?.days.find(
      (day) => day.date.toISOString().slice(0, 10) === '2026-04-21',
    )).toMatchObject({
      gameCount: 2,
      label: 'Apr 21, 2026',
    });

    expect(heatmap.recentDays[0]?.date.toISOString().slice(0, 10)).toBe('2025-04-22');
    expect(heatmap.recentDays.at(-1)?.date.toISOString().slice(0, 10)).toBe('2026-04-21');
    expect(
      heatmap.recentDays.find((day) => day.date.toISOString().slice(0, 10) === '2026-04-20'),
    ).toMatchObject({ gameCount: 1 });
    expect(
      heatmap.recentDays.find((day) => day.date.toISOString().slice(0, 10) === '2025-04-23'),
    ).toMatchObject({ gameCount: 0 });
  });

  test('new activity stats return empty structures when no games exist', async () => {
    await createTestPlayer({ name: 'Alice' });

    await expect(getPlayerAttendanceSeries()).resolves.toEqual({
      weekly: [],
      monthly: [],
    });
    await expect(getCalendarHeatmapData()).resolves.toEqual({
      recentDays: [],
      recentRangeLabel: null,
      years: [],
      defaultYear: null,
    });
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
      players: [
        { playerId: alice.id, score: 9, isWinner: true },
      ],
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
