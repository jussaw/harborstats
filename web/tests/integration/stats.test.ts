import { describe, expect, test } from 'vitest';
import { getPlayerPodiumRates, getPlayerScoreStats, getPlayerWinRates } from '@/lib/stats';
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
});
