import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PlayerSelect } from '@/components/PlayerSelect';
import { PlayerTier } from '@/lib/player-tier';

const players = [
  { id: 1, name: 'Ada', tier: PlayerTier.Premium },
  { id: 2, name: 'Bea', tier: PlayerTier.Standard },
  { id: 3, name: 'Cara', tier: PlayerTier.Standard },
];

describe('PlayerSelect', () => {
  it('uses the focused input as the open combobox and exposes the highlighted option', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();

    render(
      <PlayerSelect players={players} value={null} selectedPlayerIds={[3]} onChange={onChange} />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Player' }));

    const input = screen.getByRole('combobox', { name: 'Player' });
    const listbox = screen.getByRole('listbox');
    const ada = within(listbox).getByRole('option', { name: 'Ada' });
    const bea = within(listbox).getByRole('option', { name: 'Bea' });
    const cara = within(listbox).getByRole('option', { name: 'Cara' });

    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(input).toHaveAttribute('aria-activedescendant', ada.id);
    expect(listbox.id).toMatch(/^player-select-listbox-/);
    expect(ada.id).toMatch(/^player-select-option-1-/);
    expect(bea.id).toMatch(/^player-select-option-2-/);
    expect(cara.id).toMatch(/^player-select-option-3-/);
    expect(cara).toBeDisabled();

    await user.keyboard('{ArrowDown}');

    expect(input).toHaveAttribute('aria-activedescendant', bea.id);

    await user.keyboard('{Enter}');

    expect(onChange).toHaveBeenCalledWith(2);
  });

  it('preserves filtering while keeping aria-activedescendant in the filtered list', async () => {
    const user = userEvent.setup();

    render(<PlayerSelect players={players} value={null} selectedPlayerIds={[]} onChange={vi.fn()} />);

    await user.click(screen.getByRole('combobox', { name: 'Player' }));
    await user.type(screen.getByRole('combobox', { name: 'Player' }), 'ca');

    const input = screen.getByRole('combobox', { name: 'Player' });
    const listbox = screen.getByRole('listbox');
    const cara = within(listbox).getByRole('option', { name: 'Cara' });

    expect(within(listbox).queryByRole('option', { name: 'Ada' })).not.toBeInTheDocument();
    expect(input).toHaveAttribute('aria-activedescendant', cara.id);
  });
});
