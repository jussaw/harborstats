import { describe, expect, test, vi } from 'vitest';

import { db } from '@/lib/db';
import { PlayerTier } from '@/lib/player-tier';
import { resolveStatsFilter, type StatsFilter } from '@/lib/stats-filter';
import {
  getGameActivityTimestamps,
  getPerPlayerScoreDistributions,
  getPlayerAttendanceEvents,
  getPlayerClutchFactors,
  getPlayerConsistencyRatings,
  getPlayerCumulativeScoreStats,
  getPlayerCurrentWinStreaks,
  getPlayerDominanceIndex,
  getPlayerExpectedVsActualWins,
  getPlayerFinishBreakdowns,
  getPlayerHeadToHeadRecords,
  getPlayerKingmakers,
  getPlayerNailBiterRecords,
  getPlayerNormalizedScoreStats,
  getPlayerParticipationRates,
  getPlayerPodiumRates,
  getPlayerScoreStats,
  getPlayerStreakRecords,
  getPlayerWinEvents,
  getPlayerWinRates,
  getRivalryAggregates,
  getScoreHistogramBuckets,
  getSingleGameRecords,
  getTierShowdownStats,
  getWinningScoreByGameSize,
  getWinningScoreComparison,
} from '@/lib/stats';
import { getStatsPageData, type StatsPageData } from '@/lib/stats-page-data';
import { createTestGame, createTestPlayer } from '../helpers/db';

// Every query drizzle-postgres issues funnels through `client.unsafe(query, params)`; counting
// those calls gives a driver-level count of real source queries per orchestration.
async function countQueries<T>(run: () => Promise<T>): Promise<{ result: T; queries: number }> {
  const spy = vi.spyOn(db.$client, 'unsafe');
  spy.mockClear();
  const result = await run();
  const queries = spy.mock.calls.length;
  spy.mockRestore();
  return { result, queries };
}

// The exact fan-out the /stats page performs today: awaiting every public game/participant-sourced
// getter independently. This is the baseline the deduped bundle must beat on query count while
// reproducing every output byte-for-byte.
async function loadViaPublicGetterFanOut(filter: StatsFilter): Promise<StatsPageData> {
  const [
    winRates,
    scoreStats,
    scoreHistogramBuckets,
    perPlayerScoreDistributions,
    cumulativeScoreStats,
    normalizedScoreStats,
    podiumRates,
    finishBreakdowns,
    tierShowdown,
    expectedVsActualWins,
    gameActivityTimestamps,
    participationRates,
    playerAttendanceEvents,
    currentWinStreaks,
    playerWinEvents,
    playerStreakRecords,
    singleGameRecords,
    winningScoreComparison,
    winningScoreByGameSize,
    headToHeadRecords,
    rivalryAggregates,
    consistencyRatings,
    dominanceIndex,
    nailBiterRecords,
    clutchFactors,
    kingmakers,
  ] = await Promise.all([
    getPlayerWinRates(filter),
    getPlayerScoreStats(filter),
    getScoreHistogramBuckets(filter),
    getPerPlayerScoreDistributions(filter),
    getPlayerCumulativeScoreStats(filter),
    getPlayerNormalizedScoreStats(filter),
    getPlayerPodiumRates(filter),
    getPlayerFinishBreakdowns(filter),
    getTierShowdownStats(filter),
    getPlayerExpectedVsActualWins(filter),
    getGameActivityTimestamps(filter),
    getPlayerParticipationRates(filter),
    getPlayerAttendanceEvents(filter),
    getPlayerCurrentWinStreaks(filter),
    getPlayerWinEvents(filter),
    getPlayerStreakRecords(filter),
    getSingleGameRecords(filter),
    getWinningScoreComparison(filter),
    getWinningScoreByGameSize(filter),
    getPlayerHeadToHeadRecords(filter),
    getRivalryAggregates(filter),
    getPlayerConsistencyRatings(filter),
    getPlayerDominanceIndex(filter),
    getPlayerNailBiterRecords(filter),
    getPlayerClutchFactors(filter),
    getPlayerKingmakers(filter),
  ]);

  return {
    winRates,
    scoreStats,
    scoreHistogramBuckets,
    perPlayerScoreDistributions,
    cumulativeScoreStats,
    normalizedScoreStats,
    podiumRates,
    finishBreakdowns,
    tierShowdown,
    expectedVsActualWins,
    gameActivityTimestamps,
    participationRates,
    playerAttendanceEvents,
    currentWinStreaks,
    playerWinEvents,
    playerStreakRecords,
    singleGameRecords,
    winningScoreComparison,
    winningScoreByGameSize,
    headToHeadRecords,
    rivalryAggregates,
    consistencyRatings,
    dominanceIndex,
    nailBiterRecords,
    clutchFactors,
    kingmakers,
  };
}

// A cohort with mixed tiers, game sizes 2-6, distinct winners, ties, and dates spread across days
// so that every card in the bundle has non-trivial data to reproduce.
async function seedRichFixture() {
  const ada = await createTestPlayer({ name: 'Ada', tier: PlayerTier.Premium });
  const bea = await createTestPlayer({ name: 'Bea', tier: PlayerTier.Premium });
  const cara = await createTestPlayer({ name: 'Cara', tier: PlayerTier.Standard });
  const dev = await createTestPlayer({ name: 'Dev', tier: PlayerTier.Standard });
  const eve = await createTestPlayer({ name: 'Eve', tier: PlayerTier.Standard });
  const fin = await createTestPlayer({ name: 'Fin', tier: PlayerTier.Standard });

  await createTestGame({
    playedAt: new Date('2026-01-05T18:00:00.000Z'),
    players: [
      { playerId: ada.id, score: 12, isWinner: true },
      { playerId: bea.id, score: 11, isWinner: false },
    ],
  });
  await createTestGame({
    playedAt: new Date('2026-01-07T18:00:00.000Z'),
    players: [
      { playerId: ada.id, score: 10, isWinner: true },
      { playerId: bea.id, score: 9, isWinner: false },
      { playerId: cara.id, score: 8, isWinner: false },
    ],
  });
  await createTestGame({
    playedAt: new Date('2026-01-12T18:00:00.000Z'),
    players: [
      { playerId: bea.id, score: 15, isWinner: true },
      { playerId: cara.id, score: 6, isWinner: false },
      { playerId: dev.id, score: 5, isWinner: false },
      { playerId: eve.id, score: 4, isWinner: false },
    ],
  });
  await createTestGame({
    playedAt: new Date('2026-02-02T18:00:00.000Z'),
    players: [
      { playerId: ada.id, score: 9, isWinner: true },
      { playerId: cara.id, score: 9, isWinner: false },
      { playerId: dev.id, score: 7, isWinner: false },
      { playerId: eve.id, score: 6, isWinner: false },
      { playerId: fin.id, score: 3, isWinner: false },
    ],
  });
  await createTestGame({
    playedAt: new Date('2026-02-20T18:00:00.000Z'),
    players: [
      { playerId: ada.id, score: 14, isWinner: true },
      { playerId: bea.id, score: 13, isWinner: false },
      { playerId: cara.id, score: 12, isWinner: false },
      { playerId: dev.id, score: 10, isWinner: false },
      { playerId: eve.id, score: 8, isWinner: false },
      { playerId: fin.id, score: 2, isWinner: false },
    ],
  });
  await createTestGame({
    playedAt: new Date('2026-03-03T18:00:00.000Z'),
    players: [
      { playerId: dev.id, score: 11, isWinner: true },
      { playerId: eve.id, score: 10, isWinner: false },
      { playerId: fin.id, score: 9, isWinner: false },
    ],
  });

  return { ids: [ada.id, bea.id, cara.id, dev.id, eve.id, fin.id], subset: [ada.id, bea.id, cara.id] };
}

const BUNDLE_KEYS: (keyof StatsPageData)[] = [
  'winRates',
  'scoreStats',
  'scoreHistogramBuckets',
  'perPlayerScoreDistributions',
  'cumulativeScoreStats',
  'normalizedScoreStats',
  'podiumRates',
  'finishBreakdowns',
  'tierShowdown',
  'expectedVsActualWins',
  'gameActivityTimestamps',
  'participationRates',
  'playerAttendanceEvents',
  'currentWinStreaks',
  'playerWinEvents',
  'playerStreakRecords',
  'singleGameRecords',
  'winningScoreComparison',
  'winningScoreByGameSize',
  'headToHeadRecords',
  'rivalryAggregates',
  'consistencyRatings',
  'dominanceIndex',
  'nailBiterRecords',
  'clutchFactors',
  'kingmakers',
];

function expectBundlesEqual(actual: StatsPageData, expected: StatsPageData) {
  BUNDLE_KEYS.forEach((key) => {
    expect(actual[key], `bundle field "${key}" must match the public getter output`).toEqual(
      expected[key],
    );
  });
}

// Assert one filter's deduped bundle reproduces the public-getter fan-out while issuing strictly
// fewer source queries. The two orchestrations must run sequentially: `countQueries` installs a
// shared spy on `db.$client.unsafe`, so a `Promise.all` here would interleave the two runs and let
// each one's queries pollute the other's count. Calling this helper once per filter keeps every
// measurement isolated without an awaited loop.
async function assertDedupedBundleMatchesFanOut(label: string, filter: StatsFilter) {
  const fanOut = await countQueries(() => loadViaPublicGetterFanOut(filter));
  const bundle = await countQueries(() => getStatsPageData(filter));

  // eslint-disable-next-line no-console
  console.log(`[queries] ${label}: bundle=${bundle.queries} fanOut=${fanOut.queries}`);
  expectBundlesEqual(bundle.result, fanOut.result);

  expect(
    bundle.queries,
    `getStatsPageData must issue fewer source queries than the fan-out for the ${label} filter ` +
      `(bundle=${bundle.queries}, fanOut=${fanOut.queries})`,
  ).toBeLessThan(fanOut.queries);
}

describe('getStatsPageData request-local source deduplication', () => {
  test('reproduces every fan-out output with fewer source queries for null, subset, and empty filters', async () => {
    const { ids, subset } = await seedRichFixture();

    const nullFilter: StatsFilter = null;
    const subsetFilter = await resolveStatsFilter(subset, ids);
    const emptyFilter = await resolveStatsFilter([], ids);

    await assertDedupedBundleMatchesFanOut('null', nullFilter);
    await assertDedupedBundleMatchesFanOut('subset', subsetFilter);
    await assertDedupedBundleMatchesFanOut('empty', emptyFilter);
  });
});
