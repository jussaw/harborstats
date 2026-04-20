import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { PlayerTier } from '@/lib/player-tier';

vi.mock('@/lib/players', () => ({
  getPlayerById: vi.fn(),
}));

import { getPlayerById } from '@/lib/players';
import PlayerProfilePage from '@/app/players/[id]/page';

describe('PlayerProfilePage premium badge', () => {
  it('shows the premium badge for premium players', async () => {
    vi.mocked(getPlayerById).mockResolvedValue({
      id: 1,
      name: 'Ada',
      tier: PlayerTier.Premium,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const element = await PlayerProfilePage({ params: Promise.resolve({ id: '1' }) });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('Ada');
    expect(markup).toContain('PREMIUM');
  });

  it('does not show the premium badge for standard players', async () => {
    vi.mocked(getPlayerById).mockResolvedValue({
      id: 2,
      name: 'Bea',
      tier: PlayerTier.Standard,
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const element = await PlayerProfilePage({ params: Promise.resolve({ id: '2' }) });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('Bea');
    expect(markup).not.toContain('PREMIUM');
  });
});
