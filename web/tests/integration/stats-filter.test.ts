import { describe, expect, test } from 'vitest';

import {
  getGameActivityTimestamps,
  getGamesOverTimeSeries,
  getPlayerHeadToHeadRecords,
  getPlayerPodiumRates,
  getPlayerWinRates,
} from '@/lib/stats';
import { resolveStatsFilter } from '@/lib/stats-filter';
import { PlayerTier } from '@/lib/player-tier';
import { createTestGame, createTestPlayer } from '../helpers/db';

// A -> only ever plays with B and C; B -> with A and C; C -> the "outsider" we filter out.
// game1 {A,B}      -> eligible for a {A,B} cohort
// game2 {A,B,C}    -> excluded (contains a non-selected player)
// game3 {A,C}      -> excluded
async function seedCohortFixture() {
  const alice = await createTestPlayer({ name: 'Alice', tier: PlayerTier.Premium });
  const bob = await createTestPlayer({ name: 'Bob', tier: PlayerTier.Standard });
  const carol = await createTestPlayer({ name: 'Carol', tier: PlayerTier.Standard });

  const game1 = await createTestGame({
    playedAt: new Date('2026-04-20T18:00:00.000Z'),
    players: [
      { playerId: alice.id, score: 10, isWinner: true },
      { playerId: bob.id, score: 8, isWinner: false },
    ],
  });

  await createTestGame({
    playedAt: new Date('2026-04-21T18:00:00.000Z'),
    players: [
      { playerId: alice.id, score: 9, isWinner: true },
      { playerId: bob.id, score: 8, isWinner: false },
      { playerId: carol.id, score: 7, isWinner: false },
    ],
  });

  await createTestGame({
    playedAt: new Date('2026-04-22T18:00:00.000Z'),
    players: [
      { playerId: alice.id, score: 10, isWinner: true },
      { playerId: carol.id, score: 6, isWinner: false },
    ],
  });

  return { alice, bob, carol, game1 };
}

describe('stats cohort filter', () => {
  test('resolveStatsFilter keeps only games whose full roster is selected', async () => {
    const { alice, bob, carol, game1 } = await seedCohortFixture();
    const allPlayerIds = [alice.id, bob.id, carol.id];

    const filter = await resolveStatsFilter([alice.id, bob.id], allPlayerIds);

    expect(filter).not.toBeNull();
    expect(filter?.selectedPlayerIds).toEqual([alice.id, bob.id]);
    expect(filter?.eligibleGameIds).toEqual([game1.id]);
  });

  test('resolveStatsFilter returns null when every player is selected', async () => {
    const { alice, bob, carol } = await seedCohortFixture();
    const allPlayerIds = [alice.id, bob.id, carol.id];

    await expect(resolveStatsFilter(allPlayerIds, allPlayerIds)).resolves.toBeNull();
  });

  test('a query-builder leaderboard excludes games with a non-selected player', async () => {
    const { alice, bob, carol } = await seedCohortFixture();
    const allPlayerIds = [alice.id, bob.id, carol.id];
    const filter = await resolveStatsFilter([alice.id, bob.id], allPlayerIds);

    const winRates = await getPlayerWinRates(filter);

    // Carol is not part of the cohort; only the single {A,B} game counts.
    expect(winRates.map((row) => row.playerId).sort()).toEqual([alice.id, bob.id].sort());
    const aliceRow = winRates.find((row) => row.playerId === alice.id);
    const bobRow = winRates.find((row) => row.playerId === bob.id);
    expect(aliceRow).toMatchObject({ games: 1, wins: 1, winRate: 1 });
    expect(bobRow).toMatchObject({ games: 1, wins: 0, winRate: 0 });
  });

  test('a raw-SQL leaderboard (podium rates) respects the cohort', async () => {
    const { alice, bob, carol } = await seedCohortFixture();
    const allPlayerIds = [alice.id, bob.id, carol.id];
    const filter = await resolveStatsFilter([alice.id, bob.id], allPlayerIds);

    const podiums = await getPlayerPodiumRates(filter);

    expect(podiums.map((row) => row.playerId).sort()).toEqual([alice.id, bob.id].sort());
    podiums.forEach((row) => {
      expect(row.games).toBe(1);
    });
  });

  test('a JS-computed stat (head-to-head) only records matchups within the cohort', async () => {
    const { alice, bob, carol } = await seedCohortFixture();
    const allPlayerIds = [alice.id, bob.id, carol.id];
    const filter = await resolveStatsFilter([alice.id, bob.id], allPlayerIds);

    const records = await getPlayerHeadToHeadRecords(filter);

    expect(records.every((record) => record.playerId !== carol.id)).toBe(true);
    expect(records.every((record) => record.opponentId !== carol.id)).toBe(true);
    const aliceVsBob = records.find(
      (record) => record.playerId === alice.id && record.opponentId === bob.id,
    );
    expect(aliceVsBob?.gamesTogether).toBe(1);
    expect(aliceVsBob?.winsAgainstOpponent).toBe(1);
  });

  test('game-level activity stats count only eligible games', async () => {
    const { alice, bob, carol, game1 } = await seedCohortFixture();
    const allPlayerIds = [alice.id, bob.id, carol.id];
    const filter = await resolveStatsFilter([alice.id, bob.id], allPlayerIds);

    const timestamps = await getGameActivityTimestamps(filter);
    expect(timestamps).toEqual([game1.playedAt.toISOString()]);

    const series = await getGamesOverTimeSeries(filter);
    expect(series.totalGames).toBe(1);
  });

  test('an empty selection yields empty stats', async () => {
    const { alice, bob, carol } = await seedCohortFixture();
    const allPlayerIds = [alice.id, bob.id, carol.id];
    const filter = await resolveStatsFilter([], allPlayerIds);

    expect(filter?.eligibleGameIds).toEqual([]);
    await expect(getPlayerWinRates(filter)).resolves.toEqual([]);
    await expect(getGameActivityTimestamps(filter)).resolves.toEqual([]);
  });

  test('a null filter matches the unfiltered result', async () => {
    const { alice } = await seedCohortFixture();

    const winRates = await getPlayerWinRates(null);
    const aliceRow = winRates.find((row) => row.playerId === alice.id);

    // Alice appears in all three seeded games when nothing is filtered.
    expect(winRates).toHaveLength(3);
    expect(aliceRow?.games).toBe(3);
  });
});
