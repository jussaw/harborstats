import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import HomePage from '@/app/page';
import { listRecentGames } from '@/lib/games';
import { getPlayers } from '@/lib/players';
import { getRecentActivitySummary } from '@/lib/stats';

vi.mock('@/lib/games', () => ({
  listRecentGames: vi.fn(),
}));

vi.mock('@/lib/players', () => ({
  getPlayers: vi.fn(),
}));

vi.mock('@/lib/stats', () => ({
  getRecentActivitySummary: vi.fn(),
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

    const element = await HomePage();
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('Recent Games');
    expect(markup).toContain('Days Since Last Game');
    expect(markup).toContain('Latest recorded game');
    expect(markup).toContain('Loading your local-time view...');
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

    const element = await HomePage();
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('Days Since Last Game');
    expect(markup).toContain('No games recorded yet.');
    expect(markup).toContain('No games yet — record your first one!');
  });
});
