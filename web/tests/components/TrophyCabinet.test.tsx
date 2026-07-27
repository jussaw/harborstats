import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TrophyCabinet } from '@/components/TrophyCabinet';
import { deriveTrophies, type TrophyInput } from '@/lib/trophies';

function buildInput(overrides: Partial<TrophyInput> = {}): TrophyInput {
  return {
    games: 0,
    totalGames: 0,
    participationRate: 0,
    podiumRate: 0,
    firstRate: 0,
    winDelta: 0,
    averageVictoryMargin: null,
    winGames: 0,
    longestWinStreak: 0,
    attendanceStreak: 0,
    rating: null,
    rivals: [],
    ...overrides,
  };
}

describe('TrophyCabinet', () => {
  it('renders every trophy grouped by category with an earned summary', () => {
    const cabinet = deriveTrophies(buildInput({ games: 25, longestWinStreak: 5 }));
    render(<TrophyCabinet cabinet={cabinet} />);

    // Accessible section heading is present for assistive technology.
    expect(
      screen.getByRole('heading', { name: 'Trophy Cabinet', level: 2 }),
    ).toBeInTheDocument();
    expect(screen.getByText('2 / 12 earned')).toBeInTheDocument();

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(12);

    ['Participation', 'Performance', 'Improvement', 'Streaks', 'Rivalries'].forEach((label) => {
      expect(screen.getByRole('heading', { name: new RegExp(label), level: 3 })).toBeInTheDocument();
    });
  });

  it('distinguishes earned and locked trophies with a text label, not colour alone', () => {
    const cabinet = deriveTrophies(buildInput({ games: 25 }));
    render(<TrophyCabinet cabinet={cabinet} />);

    const regular = screen.getByText('Harbor Regular').closest('li') as HTMLElement;
    expect(within(regular).getByText('Earned')).toBeInTheDocument();
    expect(within(regular).getByText('Played 25 games')).toBeInTheDocument();

    const onFire = screen.getByText('On Fire').closest('li') as HTMLElement;
    expect(within(onFire).getByText('Locked')).toBeInTheDocument();
    expect(within(onFire).getByText(/Best run so far/)).toBeInTheDocument();
  });

  it('shows the full locked catalog when a player has no recorded games', () => {
    const cabinet = deriveTrophies(buildInput());
    render(<TrophyCabinet cabinet={cabinet} />);

    expect(screen.getByText('0 / 12 earned')).toBeInTheDocument();
    expect(screen.getAllByText('Locked')).toHaveLength(12);
    expect(screen.queryByText('Earned')).not.toBeInTheDocument();
  });
});
