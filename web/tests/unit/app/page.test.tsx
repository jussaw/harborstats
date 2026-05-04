import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import HomePage from '@/app/page';
import { listRecentGames } from '@/lib/games';
import { getPlayers } from '@/lib/players';
import {
  getPlayerCurrentWinStreaks,
  getPlayerHotHandIndicators,
  getRecentActivitySummary,
  getReigningChampionSummary,
  getPlayerWinEvents,
} from '@/lib/stats';

vi.mock('@/lib/games', () => ({
  listRecentGames: vi.fn(),
}));

vi.mock('@/lib/players', () => ({
  getPlayers: vi.fn(),
}));

vi.mock('@/lib/stats', () => ({
  getPlayerCurrentWinStreaks: vi.fn(),
  getPlayerHotHandIndicators: vi.fn(),
  getRecentActivitySummary: vi.fn(),
  getReigningChampionSummary: vi.fn(),
  getPlayerWinEvents: vi.fn(),
}));

vi.mock('@/components/NewGameButton', () => ({
  NewGameButton: () => <button type="button">New Game</button>,
}));

vi.mock('@/components/FormattedDate', () => ({
  FormattedDate: ({ iso, className }: { iso: string; className: string }) => (
    <time dateTime={iso} className={className}>
      {iso}
    </time>
  ),
}));

vi.mock('@/components/RecentActivityCard', () => ({
  RecentActivityCard: ({ latestPlayedAt }: { latestPlayedAt: string | null }) => (
    <div>Recent Activity Mock: {latestPlayedAt ?? 'none'}</div>
  ),
}));

vi.mock('@/components/CurrentWinStreakLeaderCard', () => ({
  CurrentWinStreakLeaderCard: ({
    currentWinStreaks,
  }: {
    currentWinStreaks: { name: string; streak: number }[]
  }) => (
    <div>Current Win Streak Mock: {currentWinStreaks.length}</div>
  ),
}));

vi.mock('@/components/PlayerOfMonthCard', () => ({
  PlayerOfMonthCard: ({
    players,
    winEvents,
  }: {
    players: { name: string }[]
    winEvents: { playerId: number }[]
  }) => (
    <div>
      Player of the Month Mock: {players.length}/{winEvents.length}
    </div>
  ),
}));

vi.mock('@/components/HotHandIndicatorCard', () => ({
  HotHandIndicatorCard: ({
    hotHand,
  }: {
    hotHand: { name: string; winsInLast5: number }[]
  }) => (
    <div>
      Hot Hand Indicator Mock:{' '}
      {hotHand.length > 0
        ? hotHand.map((indicator) => `${indicator.name} (${indicator.winsInLast5})`).join(', ')
        : 'none'}
    </div>
  ),
}));

describe('HomePage', () => {
  it('renders the days-since-last-game tile when activity exists', async () => {
    vi.mocked(getPlayers).mockResolvedValue([]);
    vi.mocked(listRecentGames).mockResolvedValue([
      {
        id: 1,
        playedAt: new Date('2026-04-18T12:00:00.000Z'),
        notes: 'Fast game',
        players: [
          { playerName: 'Ada', score: 10, isWinner: true },
          { playerName: 'Bea', score: 8, isWinner: false },
        ],
      },
    ]);
    vi.mocked(getRecentActivitySummary).mockResolvedValue({
      totalGames: 4,
      latestPlayedAt: '2026-04-18T12:00:00.000Z',
    });
    vi.mocked(getReigningChampionSummary).mockResolvedValue({
      playedAt: '2026-04-18T12:00:00.000Z',
      winners: [
        { playerId: 1, name: 'Ada', tier: 'premium' as const },
        { playerId: 2, name: 'Bea', tier: 'standard' as const },
      ],
    });
    vi.mocked(getPlayerCurrentWinStreaks).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: 'premium' as const,
        streak: 2,
        mostRecentAppearance: '2026-04-18T12:00:00.000Z',
        mostRecentWin: '2026-04-18T12:00:00.000Z',
      },
      {
        playerId: 2,
        name: 'Bea',
        tier: 'standard' as const,
        streak: 2,
        mostRecentAppearance: '2026-04-17T12:00:00.000Z',
        mostRecentWin: '2026-04-17T12:00:00.000Z',
      },
    ]);
    vi.mocked(getPlayerWinEvents).mockResolvedValue([
      {
        playedAt: '2026-04-01T12:00:00.000Z',
        playerId: 1,
        name: 'Ada',
        tier: 'premium' as const,
      },
      {
        playedAt: '2026-04-08T12:00:00.000Z',
        playerId: 1,
        name: 'Ada',
        tier: 'premium' as const,
      },
      {
        playedAt: '2026-04-12T12:00:00.000Z',
        playerId: 2,
        name: 'Bea',
        tier: 'standard' as const,
      },
    ]);
    vi.mocked(getPlayerHotHandIndicators).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: 'premium' as const,
        gamesInLast5: 5,
        winsInLast5: 3,
        mostRecentAppearance: '2026-04-18T12:00:00.000Z',
      },
    ]);

    const element = await HomePage();
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('Recent Games');
    expect(markup).toContain('Days Since Last Game');
    expect(markup).toContain('Reigning Champion');
    expect(markup).toContain('Current Win Streak Leader');
    expect(markup).toContain('Player of the Month');
    expect(markup).toContain('Hot Hand');
    expect(markup).toContain('aria-label="Featured summary cards"');
    expect(markup).toContain('aria-label="Secondary summary cards"');
    expect(markup).toMatch(
      /aria-label="Featured summary cards"[\s\S]*Days Since Last Game[\s\S]*Reigning Champion/,
    );
    expect(markup).toMatch(
      /aria-label="Secondary summary cards"[\s\S]*Current Win Streak Leader[\s\S]*Hot Hand[\s\S]*Player of the Month/,
    );
    expect(markup).toContain('Latest recorded game');
    expect(markup).toContain('Ada, Bea');
    expect(markup).toContain('Recent Activity Mock: 2026-04-18T12:00:00.000Z');
    expect(markup).toContain('Current Win Streak Mock: 2');
    expect(markup).toContain('Player of the Month Mock: 2/3');
    expect(markup).toContain('Hot Hand Indicator Mock: Ada (3)');
    expect(markup).toContain('2026-04-18T12:00:00.000Z');
    expect(markup).toContain('Fast game');
  });

  it('renders an empty state for the activity tile when no games are recorded', async () => {
    vi.mocked(getPlayers).mockResolvedValue([]);
    vi.mocked(listRecentGames).mockResolvedValue([]);
    vi.mocked(getRecentActivitySummary).mockResolvedValue({
      totalGames: 0,
      latestPlayedAt: null,
    });
    vi.mocked(getReigningChampionSummary).mockResolvedValue(null);
    vi.mocked(getPlayerCurrentWinStreaks).mockResolvedValue([
      {
        playerId: 1,
        name: 'Ada',
        tier: 'premium' as const,
        streak: 0,
        mostRecentAppearance: null,
        mostRecentWin: null,
      },
    ]);
    vi.mocked(getPlayerWinEvents).mockResolvedValue([]);
    vi.mocked(getPlayerHotHandIndicators).mockResolvedValue([]);

    const element = await HomePage();
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('Days Since Last Game');
    expect(markup).toContain('No games recorded yet.');
    expect(markup).toContain('Reigning Champion');
    expect(markup).toContain('Current Win Streak Leader');
    expect(markup).toContain('Player of the Month');
    expect(markup).toContain('Hot Hand');
    expect(markup).toContain('aria-label="Featured summary cards"');
    expect(markup).toContain('aria-label="Secondary summary cards"');
    expect(markup).toContain('Recent Activity Mock: none');
    expect(markup).toContain('Current Win Streak Mock: 1');
    expect(markup).toContain('Player of the Month Mock: 1/0');
    expect(markup).toContain('Hot Hand Indicator Mock: none');
    expect(markup).toContain('No games yet — record your first one!');
  });
});
