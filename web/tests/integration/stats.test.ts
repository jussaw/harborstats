import { describe, expect, test } from 'vitest';
import {
  getPlayerFinishBreakdowns,
  getPlayerMarginStats,
  getPlayerPodiumRates,
  getPlayerScoreStats,
  getPlayerWinRates,
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
});
