import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GamesFilters } from '@/components/GamesFilters';
import { PlayerTier } from '@/lib/player-tier';

const { replaceMock } = vi.hoisted(() => ({
  replaceMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/games',
  useRouter: () => ({ replace: replaceMock }),
}));

const players = [
  { id: 1, name: 'Ada', tier: PlayerTier.Premium, createdAt: new Date('2026-01-01T00:00:00.000Z') },
  { id: 2, name: 'Bea', tier: PlayerTier.Standard, createdAt: new Date('2026-01-02T00:00:00.000Z') },
  { id: 3, name: 'Cara', tier: PlayerTier.Standard, createdAt: new Date('2026-01-03T00:00:00.000Z') },
];

describe('GamesFilters', () => {
  beforeEach(() => {
    replaceMock.mockReset();
  });

  it('starts collapsed with the all-players summary when no filters are active', async () => {
    const user = userEvent.setup();

    render(
      <GamesFilters
        players={players}
        pageSize={20}
        filters={{ playerIds: [], from: null, to: null }}
      />,
    );

    const toggle = screen.getByRole('button', { name: /filters/i });

    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByLabelText('Players')).not.toBeInTheDocument();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('All players')).toBeInTheDocument();
    expect(screen.getByLabelText('Players')).toBeInTheDocument();
    expect(screen.getByLabelText('From')).toHaveAttribute('type', 'date');
    expect(screen.getByLabelText('To')).toHaveAttribute('type', 'date');
  });

  it('auto-applies player changes and resets to page 1', async () => {
    const user = userEvent.setup();

    render(
      <GamesFilters
        players={players}
        pageSize={20}
        filters={{ playerIds: [], from: null, to: null }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /filters/i }));
    await user.click(screen.getByLabelText('Players'));
    await user.click(screen.getByLabelText('Ada'));

    expect(replaceMock).toHaveBeenCalledWith('/games?page=1&pageSize=20&player=1');
  });

  it('clears only player selections and preserves the date range', async () => {
    const user = userEvent.setup();

    render(
      <GamesFilters
        players={players}
        pageSize={20}
        filters={{
          playerIds: [1, 2],
          from: new Date('2026-04-01T00:00:00.000Z'),
          to: new Date('2026-04-20T23:59:59.999Z'),
        }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /filters/i }));
    await user.click(screen.getByRole('button', { name: /clear players/i }));

    expect(replaceMock).toHaveBeenCalledWith(
      '/games?page=1&pageSize=20&from=2026-04-01T00%3A00%3A00.000Z&to=2026-04-20T23%3A59%3A59.999Z',
    );
  });

  it('waits until blur before auto-applying date input changes', async () => {
    const user = userEvent.setup();

    render(
      <GamesFilters
        players={players}
        pageSize={50}
        filters={{ playerIds: [2], from: null, to: new Date('2026-04-20T23:59:59.999Z') }}
      />,
    );

    await user.click(screen.getByRole('button', { name: /filters/i }));

    const fromInput = screen.getByLabelText('From');
    const toInput = screen.getByLabelText('To');

    expect(fromInput).toHaveAttribute('type', 'date');
    expect(toInput).toHaveValue('2026-04-20');

    fireEvent.change(fromInput, { target: { value: '2026-04-01' } });

    expect(replaceMock).not.toHaveBeenCalled();

    fireEvent.blur(fromInput);

    expect(replaceMock).toHaveBeenCalledWith(
      '/games?page=1&pageSize=50&player=2&from=2026-04-01T00%3A00%3A00.000Z&to=2026-04-20T23%3A59%3A59.999Z',
    );
  });
});
