import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AdminPlayersPage from '@/app/admin/players/page';
import { listPlayersWithUsage } from '@/lib/players';

vi.mock('@/lib/players', () => ({
  listPlayersWithUsage: vi.fn(),
}));

// The page wires the inline forms to these server actions; the unit render only
// needs their identities, not their real (DB/session-touching) implementations.
vi.mock('@/app/admin/players/actions', () => ({
  createPlayerAction: vi.fn(),
  updatePlayerAction: vi.fn(),
  deletePlayerAction: vi.fn(),
}));

async function renderPage(searchParams: { error?: string; count?: string }): Promise<string> {
  const element = await AdminPlayersPage({ searchParams: Promise.resolve(searchParams) });
  return renderToStaticMarkup(element);
}

describe('AdminPlayersPage error banners', () => {
  beforeEach(() => {
    vi.mocked(listPlayersWithUsage).mockResolvedValue([]);
  });

  it('renders the duplicate-name banner for error=duplicate-name', async () => {
    expect(await renderPage({ error: 'duplicate-name' })).toContain('already exists');
  });

  it('still renders the name-required banner for error=name-required', async () => {
    expect(await renderPage({ error: 'name-required' })).toContain('Player name is required');
  });

  it('still renders the player-in-use banner for error=player-in-use', async () => {
    expect(await renderPage({ error: 'player-in-use', count: '2' })).toContain('Cannot delete');
  });

  it('renders no duplicate-name banner without an error param', async () => {
    expect(await renderPage({})).not.toContain('already exists');
  });
});
