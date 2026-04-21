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
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.hover(screen.getByRole('button', { name: 'Apr 7: 4 appearances' }));

    const firstDialog = screen.getByRole('dialog', { name: 'Attendance details for Apr 7' });

    expect(firstDialog).toHaveAttribute(
      'data-side',
      'right',
    );
    const firstTop = Number.parseFloat(firstDialog.style.top);
    expect(screen.getByText('4 appearances')).toBeInTheDocument();
    expect(screen.getByText('Ada: 3')).toBeInTheDocument();
    expect(screen.getByText('Bea: 1')).toBeInTheDocument();

    await user.hover(screen.getByRole('button', { name: 'Apr 14: 0 appearances' }));

    const secondDialog = screen.getByRole('dialog', { name: 'Attendance details for Apr 14' });

    expect(secondDialog).toHaveAttribute(
      'data-side',
      'left',
    );
    const secondTop = Number.parseFloat(secondDialog.style.top);
    expect(secondTop).toBeGreaterThan(firstTop);
    expect(secondTop).toBeLessThan(65);
    expect(screen.getByText('No appearances in this bucket.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Month' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await user.hover(screen.getByRole('button', { name: 'Apr 2026: 5 appearances' }));

    expect(screen.getByRole('button', { name: 'Week' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.getByRole('button', { name: 'Month' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('dialog', { name: 'Attendance details for Apr 2026' })).toBeInTheDocument();
    expect(screen.getByText('5 appearances')).toBeInTheDocument();
    expect(screen.getByText('Bea: 2')).toBeInTheDocument();
  });

  it('renders an empty state with no attendance data', () => {
    render(<PlayerAttendanceChart weekly={[]} monthly={[]} defaultView="week" />);

    expect(screen.getByText('No games recorded yet.')).toBeInTheDocument();
  });
});
