import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { PlayerAttendanceChart } from '@/components/PlayerAttendanceChart';
import { PlayerTier } from '@/lib/player-tier';

describe('PlayerAttendanceChart', () => {
  it('shows legend entries and reveals attendance details on hover', async () => {
    const user = userEvent.setup();

    render(
      <PlayerAttendanceChart
        weekly={[
          {
            bucketStart: new Date('2026-04-07T00:00:00.000Z'),
            label: 'Apr 7',
            totalAppearances: 4,
            segments: [
              { playerId: 1, name: 'Ada', tier: PlayerTier.Premium, gameCount: 3 },
              { playerId: 2, name: 'Bea', tier: PlayerTier.Standard, gameCount: 1 },
            ],
          },
          {
            bucketStart: new Date('2026-04-14T00:00:00.000Z'),
            label: 'Apr 14',
            totalAppearances: 0,
            segments: [],
          },
        ]}
        monthly={[
          {
            bucketStart: new Date('2026-04-01T00:00:00.000Z'),
            label: 'Apr 2026',
            totalAppearances: 5,
            segments: [
              { playerId: 1, name: 'Ada', tier: PlayerTier.Premium, gameCount: 3 },
              { playerId: 2, name: 'Bea', tier: PlayerTier.Standard, gameCount: 2 },
            ],
          },
        ]}
        defaultView="week"
      />,
    );

    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByText('Ada')).toBeInTheDocument();
    expect(screen.getByText('Bea')).toBeInTheDocument();
    expect(screen.getByText('Hover over a bar to inspect attendance.')).toBeInTheDocument();

    await user.hover(screen.getByRole('button', { name: 'Apr 7: 4 appearances' }));

    expect(screen.getByText('4 appearances')).toBeInTheDocument();
    expect(screen.getByText('Ada: 3')).toBeInTheDocument();
    expect(screen.getByText('Bea: 1')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Month' }));
    await user.hover(screen.getByRole('button', { name: 'Apr 2026: 5 appearances' }));

    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('5 appearances')).toBeInTheDocument();
    expect(screen.getByText('Bea: 2')).toBeInTheDocument();
  });

  it('renders an empty state with no attendance data', () => {
    render(<PlayerAttendanceChart weekly={[]} monthly={[]} defaultView="week" />);

    expect(screen.getByText('No games recorded yet.')).toBeInTheDocument();
  });
});
