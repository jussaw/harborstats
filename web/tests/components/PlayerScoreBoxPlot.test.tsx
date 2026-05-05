import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PlayerScoreBoxPlot } from '@/components/PlayerScoreBoxPlot';
import { PlayerTier } from '@/lib/player-tier';

describe('PlayerScoreBoxPlot', () => {
  it('renders multiple player distributions and reveals details on hover and focus', async () => {
    const user = userEvent.setup();

    render(
      <PlayerScoreBoxPlot
        distributions={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            count: 6,
            min: 5,
            q1: 7,
            median: 8,
            q3: 9,
            max: 11,
          },
          {
            playerId: 2,
            name: 'Bea',
            tier: PlayerTier.Standard,
            count: 5,
            min: 4,
            q1: 6,
            median: 7,
            q3: 8,
            max: 10,
          },
        ]}
      />,
    );

    const detailSlot = screen.getByTestId('stats-card-detail-slot');

    expect(detailSlot).toHaveAttribute('data-detail-size', 'roomy');
    expect(
      screen.getByText('Hover over a box to inspect a player score spread.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Bea')).toBeInTheDocument();

    const beaBox = screen.getByRole('button', {
      name: 'Bea: 5 games, min 4.0, q1 6.0, median 7.0, q3 8.0, max 10.0',
    });

    await user.hover(beaBox);

    expect(within(detailSlot).getByText('Bea')).toBeInTheDocument();
    expect(within(detailSlot).getByText('5 games')).toBeInTheDocument();
    expect(within(detailSlot).getByText('Min')).toBeInTheDocument();
    expect(within(detailSlot).getByText('4.0')).toBeInTheDocument();
    expect(within(detailSlot).getByText('Median')).toBeInTheDocument();
    expect(within(detailSlot).getByText('7.0')).toBeInTheDocument();
    expect(within(detailSlot).getByText('Max')).toBeInTheDocument();
    expect(within(detailSlot).getByText('10.0')).toBeInTheDocument();

    fireEvent.mouseLeave(screen.getByRole('img', { name: 'Player score distribution' }));
    expect(
      screen.getByText('Hover over a box to inspect a player score spread.'),
    ).toBeInTheDocument();

    fireEvent.focus(beaBox);
    expect(within(detailSlot).getByText('Q3')).toBeInTheDocument();
    expect(within(detailSlot).getByText('8.0')).toBeInTheDocument();
    fireEvent.blur(beaBox);
    expect(
      screen.getByText('Hover over a box to inspect a player score spread.'),
    ).toBeInTheDocument();
  });

  it('renders a single-player layout', () => {
    render(
      <PlayerScoreBoxPlot
        distributions={[
          {
            playerId: 1,
            name: 'Ada',
            tier: PlayerTier.Premium,
            count: 3,
            min: 7,
            q1: 7.5,
            median: 8,
            q3: 8.5,
            max: 9,
          },
        ]}
      />,
    );

    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Player score distribution' })).toBeInTheDocument();
  });

  it('renders an empty state with no distributions', () => {
    render(<PlayerScoreBoxPlot distributions={[]} />);

    expect(screen.getByText('No scores recorded yet.')).toBeInTheDocument();
  });
});
