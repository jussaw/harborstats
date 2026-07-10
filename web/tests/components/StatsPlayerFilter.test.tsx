import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { StatsPlayerFilter } from '@/components/StatsPlayerFilter';
import { PlayerTier } from '@/lib/player-tier';

const { replace } = vi.hoisted(() => ({ replace: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/stats',
  useRouter: () => ({ replace }),
}));

const players = [
  { id: 1, name: 'Ada', tier: PlayerTier.Premium, createdAt: new Date('2026-01-01T00:00:00.000Z') },
  { id: 2, name: 'Bea', tier: PlayerTier.Standard, createdAt: new Date('2026-01-02T00:00:00.000Z') },
  { id: 3, name: 'Cara', tier: PlayerTier.Standard, createdAt: new Date('2026-01-03T00:00:00.000Z') },
];

const allSelected = [1, 2, 3];

describe('StatsPlayerFilter', () => {
  beforeEach(() => {
    replace.mockClear();
  });

  it('defaults to every player selected', async () => {
    const user = userEvent.setup();
    render(<StatsPlayerFilter players={players} selectedPlayerIds={allSelected} />);

    await user.click(screen.getByRole('button', { name: /players/i }));

    expect(screen.getByText('All players')).toBeInTheDocument();

    players.forEach((player) => {
      expect(screen.getByRole('checkbox', { name: player.name })).toBeChecked();
    });
  });

  it('lists players alphabetically regardless of input order', async () => {
    const user = userEvent.setup();
    const unordered = [players[2], players[0], players[1]];
    render(<StatsPlayerFilter players={unordered} selectedPlayerIds={allSelected} />);

    await user.click(screen.getByRole('button', { name: /players/i }));

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes.map((box) => box.getAttribute('aria-label'))).toEqual([
      'Ada',
      'Bea',
      'Cara',
    ]);
  });

  it('shows a count on the trigger only when a subset is selected', () => {
    const { rerender } = render(
      <StatsPlayerFilter players={players} selectedPlayerIds={allSelected} />,
    );

    expect(screen.queryByText('3/3')).not.toBeInTheDocument();

    rerender(<StatsPlayerFilter players={players} selectedPlayerIds={[1]} />);

    expect(screen.getByText('1/3')).toBeInTheDocument();
  });

  it('closes the popover on Escape', async () => {
    const user = userEvent.setup();
    render(<StatsPlayerFilter players={players} selectedPlayerIds={allSelected} />);

    await user.click(screen.getByRole('button', { name: /players/i }));
    expect(screen.getByRole('checkbox', { name: 'Ada' })).toBeInTheDocument();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('checkbox', { name: 'Ada' })).not.toBeInTheDocument();
  });

  it('writes the "none" sentinel when selecting none', async () => {
    const user = userEvent.setup();
    render(<StatsPlayerFilter players={players} selectedPlayerIds={allSelected} />);

    await user.click(screen.getByRole('button', { name: /players/i }));
    await user.click(screen.getByRole('button', { name: /select none/i }));

    expect(replace).toHaveBeenCalledWith('/stats?player=none');
  });

  it('clears the query when selecting all from a subset', async () => {
    const user = userEvent.setup();
    render(<StatsPlayerFilter players={players} selectedPlayerIds={[1]} />);

    await user.click(screen.getByRole('button', { name: /players/i }));
    await user.click(screen.getByRole('button', { name: /select all/i }));

    expect(replace).toHaveBeenCalledWith('/stats');
  });

  it('writes a single delimited player param when unchecking one player', async () => {
    const user = userEvent.setup();
    render(<StatsPlayerFilter players={players} selectedPlayerIds={allSelected} />);

    await user.click(screen.getByRole('button', { name: /players/i }));
    await user.click(screen.getByRole('checkbox', { name: 'Bea' }));

    expect(replace).toHaveBeenCalledWith('/stats?player=1-3');
  });
});
