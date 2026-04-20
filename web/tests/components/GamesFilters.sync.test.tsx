import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { GamesFilters } from '@/components/GamesFilters';
import { PlayerTier } from '@/lib/player-tier';

vi.mock('next/navigation', () => ({
  usePathname: () => '/games',
  useRouter: () => ({ replace: vi.fn() }),
}));

const players = [
  { id: 1, name: 'Ada', tier: PlayerTier.Premium, createdAt: new Date('2026-01-01T00:00:00.000Z') },
  { id: 2, name: 'Bea', tier: PlayerTier.Standard, createdAt: new Date('2026-01-02T00:00:00.000Z') },
  { id: 3, name: 'Cara', tier: PlayerTier.Standard, createdAt: new Date('2026-01-03T00:00:00.000Z') },
];

describe('GamesFilters prop sync', () => {
  it('keeps the drawers open while reflecting updated filter props', async () => {
    const user = userEvent.setup();

    const { rerender } = render(
      <GamesFilters
        players={players}
        pageSize={20}
        filters={{ playerIds: [1], from: null, to: null }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /filters/i }));
    await user.click(screen.getByLabelText('Players'));

    rerender(
      <GamesFilters
        players={players}
        pageSize={20}
        filters={{ playerIds: [1, 2], from: null, to: null }}
      />,
    );

    expect(screen.getByRole('button', { name: /filters/i })).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByLabelText('Players')).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getAllByText('2 players selected').length).toBeGreaterThan(0);
  });
});
