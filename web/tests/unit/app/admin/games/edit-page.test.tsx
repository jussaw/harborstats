import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import EditGamePage from '@/app/admin/games/[id]/edit/page';
import { getGameForEdit } from '@/lib/games';
import { getPlayers } from '@/lib/players';

const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
}));

vi.mock('@/lib/games', () => ({
  getGameForEdit: vi.fn(),
}));

vi.mock('@/lib/players', () => ({
  getPlayers: vi.fn(),
}));

vi.mock('@/components/GameForm', () => ({
  type: {},
}));

vi.mock('@/app/admin/games/[id]/edit/EditGameForm', () => ({
  EditGameForm: () => <div>Edit form</div>,
}));

describe('EditGamePage', () => {
  it.each(['1abc', '0', '-1', '1.5', 'abc'])(
    'calls notFound for malformed game id "%s"',
    async (id) => {
      await expect(EditGamePage({ params: Promise.resolve({ id }) })).rejects.toThrow(
        'NEXT_NOT_FOUND',
      );
    },
  );

  it('renders the edit form for a valid game id', async () => {
    vi.mocked(getGameForEdit).mockResolvedValue({
      id: 12,
      playedAt: new Date('2026-04-21T18:00:00.000Z'),
      notes: 'Harbor rematch',
      players: [{ playerId: 1, score: 10, isWinner: true }],
    });
    vi.mocked(getPlayers).mockResolvedValue([]);

    const element = await EditGamePage({ params: Promise.resolve({ id: '12' }) });
    const markup = renderToStaticMarkup(element);

    expect(markup).toContain('Edit Game');
    expect(markup).toContain('#12');
    expect(markup).toContain('Edit form');
  });
});
