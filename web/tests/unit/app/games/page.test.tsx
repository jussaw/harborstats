import { describe, expect, it, vi } from 'vitest';

import GamesPage from '@/app/games/page';
import { GamesFilters } from '@/components/GamesFilters';
import { PageWidth } from '@/components/PageWidth';
import { listGamesPage } from '@/lib/games';
import { PlayerTier } from '@/lib/player-tier';
import { getPlayers } from '@/lib/players';

vi.mock('@/lib/games', () => ({
  listGamesPage: vi.fn(),
}));

vi.mock('@/lib/players', () => ({
  getPlayers: vi.fn(),
}));

function findElementByType(node: unknown, type: unknown): any {
  if (!node || typeof node !== 'object') return null;

  const reactNode = node as { type?: unknown; props?: { children?: unknown } };

  if (reactNode.type === type) return reactNode;

  const children = reactNode.props?.children;
  if (Array.isArray(children)) return children.map((child) => findElementByType(child, type)).find(Boolean) ?? null;

  return findElementByType(children, type);
}

describe('GamesPage', () => {
  it('renders the shared page-width contract for the games layout', async () => {
    vi.mocked(getPlayers).mockResolvedValue([
      { id: 1, name: 'Ada', tier: PlayerTier.Premium, createdAt: new Date('2026-01-01T00:00:00.000Z') },
    ]);
    vi.mocked(listGamesPage).mockResolvedValue({
      games: [],
      totalGames: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    const element = await GamesPage({
      searchParams: Promise.resolve({
        page: '1',
        pageSize: '20',
      }),
    });
    const pageWidthElement = findElementByType(element, PageWidth);

    expect(pageWidthElement).toBeTruthy();
    expect(pageWidthElement.props.width).toBe('2xl');
    expect(pageWidthElement.props.expandOnCollapse).toBeUndefined();
  });

  it('does not key the filters component by the active filter state', async () => {
    vi.mocked(getPlayers).mockResolvedValue([
      { id: 1, name: 'Ada', tier: PlayerTier.Premium, createdAt: new Date('2026-01-01T00:00:00.000Z') },
    ]);
    vi.mocked(listGamesPage).mockResolvedValue({
      games: [],
      totalGames: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    const element = await GamesPage({
      searchParams: Promise.resolve({
        page: '1',
        pageSize: '20',
        player: '1',
      }),
    });

    const filtersElement = findElementByType(element, GamesFilters);

    expect(filtersElement).toBeTruthy();
    expect(filtersElement.key).toBeNull();
  });
});
