import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import PlayersPage from '@/app/players/page';
import { listGamesForPlayer } from '@/lib/games';
import { getPlayers } from '@/lib/players';
import { PlayerTier } from '@/lib/player-tier';
import {
  getPlayerCumulativeScoreStats,
  getPlayerCurrentWinStreaks,
  getPerPlayerScoreDistributions,
  getPlayerExpectedVsActualWins,
  getPlayerFinishBreakdowns,
  getPlayerMarginStats,
  getPlayerParticipationRates,
  getPlayerPodiumRates,
  getPlayerScoreStats,
  getPlayerStreakRecords,
  getPlayerWinEvents,
  getPlayerWinRateByGameSize,
} from '@/lib/stats';

vi.mock('@/lib/players', () => ({
  getPlayers: vi.fn(),
}));

vi.mock('@/lib/games', () => ({
  listGamesForPlayer: vi.fn(),
}));

vi.mock('@/lib/stats', () => ({
  getPlayerCumulativeScoreStats: vi.fn(),
  getPlayerCurrentWinStreaks: vi.fn(),
  getPlayerExpectedVsActualWins: vi.fn(),
  getPerPlayerScoreDistributions: vi.fn(),
  getPlayerScoreStats: vi.fn(),
  getPlayerStreakRecords: vi.fn(),
  getPlayerPodiumRates: vi.fn(),
  getPlayerFinishBreakdowns: vi.fn(),
  getPlayerMarginStats: vi.fn(),
  getPlayerParticipationRates: vi.fn(),
  getPlayerWinEvents: vi.fn(),
  getPlayerWinRateByGameSize: vi.fn(),
}));

describe('PlayersPage', () => {
  beforeEach(() => {
    vi.mocked(listGamesForPlayer).mockResolvedValue([]);
    vi.mocked(getPerPlayerScoreDistributions).mockResolvedValue([]);
  });

  it('renders the first player profile alongside the players list when players exist', async () => {
    vi.mocked(getPlayers).mockResolvedValue([
      {
        id: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
      {
        id: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        createdAt: new Date('2026-01-02T00:00:00.000Z'),
      },
    ]);
    vi.mocked(getPlayerScoreStats).mockResolvedValue([
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
    ]);
    vi.mocked(getPlayerCumulativeScoreStats).mockResolvedValue([
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
    ]);
    vi.mocked(getPlayerPodiumRates).mockResolvedValue([
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
    ]);
    vi.mocked(getPlayerFinishBreakdowns).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        games: 5,
        firsts: 2,
        seconds: 1,
        thirds: 1,
        lasts: 1,
        firstRate: 0.4,
        secondRate: 0.2,
        thirdRate: 0.2,
        lastRate: 0.2,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        games: 4,
        firsts: 1,
        seconds: 2,
        thirds: 0,
        lasts: 1,
        firstRate: 0.25,
        secondRate: 0.5,
        thirdRate: 0,
        lastRate: 0.25,
      },
    ]);
    vi.mocked(getPlayerMarginStats).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        winGames: 2,
        lossGames: 3,
        averageVictoryMargin: 2.5,
        averageDefeatMargin: 1.7,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        winGames: 1,
        lossGames: 3,
        averageVictoryMargin: 1,
        averageDefeatMargin: 2.3,
      },
    ]);
    vi.mocked(getPlayerWinRateByGameSize).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        playerCount: 2,
        games: 1,
        wins: 1,
        winRate: 1,
      },
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        playerCount: 3,
        games: 2,
        wins: 1,
        winRate: 0.5,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        playerCount: 4,
        games: 4,
        wins: 1,
        winRate: 0.25,
      },
    ]);
    vi.mocked(getPlayerExpectedVsActualWins).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        games: 3,
        wins: 2,
        expectedWins: 1.2,
        winDelta: 0.8,
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
    ]);
    vi.mocked(getPerPlayerScoreDistributions).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        count: 5,
        min: 7,
        q1: 8,
        median: 9,
        q3: 10,
        max: 11,
      },
    ]);
    vi.mocked(getPlayerParticipationRates).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        gamesPlayed: 5,
        totalGames: 7,
        participationRate: 5 / 7,
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        gamesPlayed: 4,
        totalGames: 7,
        participationRate: 4 / 7,
      },
    ]);
    vi.mocked(getPlayerCurrentWinStreaks).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        streak: 2,
        mostRecentAppearance: '2026-04-20T18:00:00.000Z',
        mostRecentWin: '2026-04-20T18:00:00.000Z',
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        streak: 0,
        mostRecentAppearance: '2026-04-18T18:00:00.000Z',
        mostRecentWin: '2026-04-18T18:00:00.000Z',
      },
    ]);
    vi.mocked(getPlayerWinEvents).mockResolvedValue([
      {
        playedAt: '2026-03-01T01:00:00.000Z',
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
      },
      {
        playedAt: '2026-03-17T04:00:00.000Z',
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
      },
    ]);
    vi.mocked(getPlayerStreakRecords).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: PlayerTier.Premium,
        longestWinStreak: 2,
        longestWinStreakStartedAt: '2026-03-01T01:00:00.000Z',
        longestWinStreakEndedAt: '2026-03-17T04:00:00.000Z',
        currentLossStreak: 0,
        currentLossStreakStartedAt: null,
        currentLossStreakEndedAt: null,
        longestLossStreak: 1,
        longestLossStreakStartedAt: '2026-04-18T18:00:00.000Z',
        longestLossStreakEndedAt: '2026-04-18T18:00:00.000Z',
        attendanceStreak: 5,
        attendanceStreakStartedAt: '2026-04-16T18:00:00.000Z',
        attendanceStreakEndedAt: '2026-04-20T18:00:00.000Z',
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: PlayerTier.Standard,
        longestWinStreak: 1,
        longestWinStreakStartedAt: '2026-04-18T18:00:00.000Z',
        longestWinStreakEndedAt: '2026-04-18T18:00:00.000Z',
        currentLossStreak: 2,
        currentLossStreakStartedAt: '2026-04-19T18:00:00.000Z',
        currentLossStreakEndedAt: '2026-04-20T18:00:00.000Z',
        longestLossStreak: 2,
        longestLossStreakStartedAt: '2026-04-19T18:00:00.000Z',
        longestLossStreakEndedAt: '2026-04-20T18:00:00.000Z',
        attendanceStreak: 4,
        attendanceStreakStartedAt: '2026-04-17T18:00:00.000Z',
        attendanceStreakEndedAt: '2026-04-20T18:00:00.000Z',
      },
    ]);
    vi.mocked(listGamesForPlayer).mockResolvedValue([
      {
        id: 4,
        playedAt: new Date('2026-04-20T18:00:00.000Z'),
        notes: 'Ada wins',
        players: [
          { playerName: 'Ada', score: 11, isWinner: true },
          { playerName: 'Bea', score: 8, isWinner: false },
        ],
      },
    ]);

    const element = await PlayersPage();
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('Select a player');
    expect(markup).toContain('Ada');
    expect(markup).toContain('Bea');
    expect(markup).toContain('/players/1');
    expect(markup).toContain('/players/2');
    expect(markup).toContain('View Games (1)');
    expect(markup).toContain('PREMIUM');
    expect(markup).not.toContain('lucide-user');
    expect(markup).not.toContain('size-16 shrink-0');
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
    expect(markup).toContain('Average Score');
    expect(markup).toContain('Median Score');
    expect(markup).toContain('Total VP');
    expect(markup).toContain('Podium Rate');
    expect(markup).toContain('Participation Rate');
    expect(markup).toContain('Finish Breakdown');
    expect(markup).toContain('Win Rate by Opponent Count');
    expect(markup).toContain('Average Margin of Victory');
    expect(markup).toContain('Average Margin of Defeat');
    expect(markup).toContain('Expected vs Actual Wins');
    expect(markup).toContain('Score Distribution');
    expect(markup).toContain('Current Win Streak');
    expect(markup).toContain('Most Wins in a Week');
    expect(markup).toContain('Most Wins in a Month');
    expect(markup).toContain('Longest Win Streak Ever');
    expect(markup).toContain('Current / Longest Loss Streak');
    expect(markup).toContain('Attendance Streak');
    expect(markup).toContain('9.4');
    expect(markup).toContain('47');
    expect(markup).toContain('9.0');
    expect(markup).toContain('80.0%');
    expect(markup).toContain('71.4%');
    expect(markup).toContain('40.0% (2)');
    expect(markup).toContain('20.0% (1)');
    expect(markup).toContain('2p');
    expect(markup).toContain('3p');
    expect(markup).toContain('+0.8');
    expect(markup).toContain('2 actual wins vs 1.2 expected across 3 games');
    expect(markup).toContain('2.5');
    expect(markup).toContain('1.7');
    expect(markup).toContain('2 wins');
    expect(markup).toContain('Current: 0 losses');
    expect(markup).toContain('Longest: 1 loss');
    expect(markup).toContain('5 games');
    expect(markup).toContain('Across 5 games');
    expect(markup).toContain('4 podiums in 5 games');
    expect(markup).toContain('5 appearances in 7 total games');
    expect(markup).toContain('Across 2 wins');
    expect(markup).toContain('Across 3 losses');
    expect(markup).toContain('Loading your local-time view...');
  });

  it('renders an empty state when there are no players', async () => {
    vi.mocked(getPlayers).mockResolvedValue([]);
    vi.mocked(getPlayerScoreStats).mockResolvedValue([]);
    vi.mocked(getPlayerCumulativeScoreStats).mockResolvedValue([]);
    vi.mocked(getPlayerPodiumRates).mockResolvedValue([]);
    vi.mocked(getPlayerFinishBreakdowns).mockResolvedValue([]);
    vi.mocked(getPlayerMarginStats).mockResolvedValue([]);
    vi.mocked(getPlayerParticipationRates).mockResolvedValue([]);
    vi.mocked(getPlayerWinRateByGameSize).mockResolvedValue([]);
    vi.mocked(getPlayerExpectedVsActualWins).mockResolvedValue([]);
    vi.mocked(getPlayerCurrentWinStreaks).mockResolvedValue([]);
    vi.mocked(getPlayerWinEvents).mockResolvedValue([]);
    vi.mocked(getPlayerStreakRecords).mockResolvedValue([]);

    const element = await PlayersPage();
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('No players yet.');
    expect(markup).toContain('Add your first player in admin');
  });
});
